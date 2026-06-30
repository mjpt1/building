import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChargeStatus,
  LedgerEntryType,
  LedgerRefType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  TransactionStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AccountingService } from '@/modules/accounting/accounting.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PaymentGatewayService } from '@/integrations/payment/payment-gateway.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { parseJalaliInput, toJalali } from '@/common/utils/jalali.util';
import { generateReceiptNo } from '@/common/utils/crypto.util';
import { calculatePenalty } from '@/modules/charges/charge-calculator';
import { CreatePaymentDto, InitiateOnlineDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly gateway: PaymentGatewayService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** اعمال یک پرداخت روی شارژ و به‌روزرسانی وضعیت آن (داخل تراکنش) */
  private async applyToCharge(tx: Prisma.TransactionClient, chargeId: string, amount: number) {
    const charge = await tx.charge.findUnique({ where: { id: chargeId } });
    if (!charge) throw new NotFoundException('شارژ یافت نشد.');
    const paid = Number(charge.paidAmount) + amount;
    const total = Number(charge.amount) + Number(charge.penaltyAmount);
    let status: ChargeStatus = ChargeStatus.PARTIAL;
    if (paid >= total) status = ChargeStatus.PAID;
    else if (paid <= 0) status = ChargeStatus.PENDING;
    await tx.charge.update({
      where: { id: chargeId },
      data: { paidAmount: paid, status },
    });
    return charge;
  }

  /** ثبت پرداخت دستی (نقدی/کارت/واریز) */
  async recordManual(buildingId: string, dto: CreatePaymentDto, userId: string) {
    const cashbox = dto.cashboxId
      ? await this.prisma.cashbox.findUnique({ where: { id: dto.cashboxId } })
      : await this.prisma.cashbox.findFirst({
          where: { buildingId, deletedAt: null, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
    if (!cashbox) throw new BadRequestException('صندوقی برای ثبت پرداخت موجود نیست.');

    const paidAt = dto.paidAt ? parseJalaliInput(dto.paidAt) : new Date();

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          buildingId,
          unitId: dto.unitId,
          chargeId: dto.chargeId,
          residentId: dto.residentId,
          cashboxId: cashbox.id,
          amount: dto.amount,
          method: dto.method,
          type: dto.type ?? PaymentType.CHARGE,
          status: PaymentStatus.CONFIRMED,
          receiptNo: generateReceiptNo(),
          paidAt,
          description: dto.description,
          recordedById: userId,
        },
      });
      if (dto.chargeId) await this.applyToCharge(tx, dto.chargeId, dto.amount);
      await this.accounting.recordMovement(
        {
          buildingId,
          cashboxId: cashbox.id,
          entryType: LedgerEntryType.CREDIT,
          refType: LedgerRefType.PAYMENT,
          refId: p.id,
          amount: dto.amount,
          description: `پرداخت ${this.methodLabel(dto.method)}${dto.unitId ? '' : ''}`,
          occurredAt: paidAt,
          createdById: userId,
        },
        tx,
      );
      return p;
    });

    await this.audit.log({
      userId,
      buildingId,
      action: 'PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      after: { amount: dto.amount, method: dto.method },
    });
    return payment;
  }

  /** شروع پرداخت آنلاین: ساخت تراکنش و دریافت لینک درگاه */
  async initiateOnline(dto: InitiateOnlineDto, userId: string) {
    const charge = await this.prisma.charge.findUnique({
      where: { id: dto.chargeId },
      include: {
        unit: { select: { id: true, code: true, buildingId: true, currentResident: { select: { mobile: true } } } },
      },
    });
    if (!charge) throw new NotFoundException('شارژ یافت نشد.');

    const penalty = calculatePenalty(charge.dueDate, 0);
    const remaining = Number(charge.amount) + Number(charge.penaltyAmount) - Number(charge.paidAmount);
    const amount = dto.amount ?? Math.max(0, remaining);
    if (amount <= 0) throw new BadRequestException('این شارژ بدهی پرداخت‌نشده ندارد.');

    const callbackUrl = this.config.get<string>('payment.callbackUrl')!;
    const result = await this.gateway.request({
      amount,
      description: `پرداخت شارژ واحد ${charge.unit.code}`,
      mobile: charge.unit.currentResident?.mobile,
      callbackUrl,
    });

    await this.prisma.paymentTransaction.create({
      data: {
        buildingId: charge.unit.buildingId,
        unitId: charge.unit.id,
        amount,
        gateway: this.config.get<string>('payment.provider') ?? 'mock',
        authority: result.authority,
        status: TransactionStatus.PENDING,
        payerMobile: charge.unit.currentResident?.mobile,
        description: `شارژ واحد ${charge.unit.code}`,
        callbackPayload: { chargeId: dto.chargeId },
      },
    });

    return { redirectUrl: result.redirectUrl, authority: result.authority, amount };
  }

  /** بازگشت از درگاه و تایید پرداخت */
  async verifyOnline(authority: string, status: string) {
    const trx = await this.prisma.paymentTransaction.findUnique({ where: { authority } });
    if (!trx) throw new NotFoundException('تراکنش یافت نشد.');
    if (trx.status === TransactionStatus.SUCCESS) {
      return { success: true, message: 'این تراکنش قبلاً تایید شده است.', refId: trx.refId };
    }
    if (status !== 'OK') {
      await this.prisma.paymentTransaction.update({
        where: { id: trx.id },
        data: { status: TransactionStatus.CANCELED },
      });
      return { success: false, message: 'پرداخت توسط کاربر لغو شد.' };
    }

    const verify = await this.gateway.verify(authority, Number(trx.amount));
    if (!verify.success) {
      await this.prisma.paymentTransaction.update({
        where: { id: trx.id },
        data: { status: TransactionStatus.FAILED, callbackPayload: { ...(trx.callbackPayload as any), verify } },
      });
      return { success: false, message: verify.message };
    }

    const chargeId = (trx.callbackPayload as any)?.chargeId as string | undefined;
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { buildingId: trx.buildingId, deletedAt: null, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          buildingId: trx.buildingId,
          unitId: trx.unitId,
          chargeId,
          cashboxId: cashbox?.id,
          amount: trx.amount,
          method: PaymentMethod.ONLINE,
          type: PaymentType.CHARGE,
          status: PaymentStatus.CONFIRMED,
          receiptNo: generateReceiptNo(),
          paidAt: new Date(),
          description: 'پرداخت آنلاین شارژ',
        },
      });
      await tx.paymentTransaction.update({
        where: { id: trx.id },
        data: {
          status: TransactionStatus.SUCCESS,
          refId: verify.refId,
          cardPan: verify.cardPan,
          paymentId: p.id,
          paidAt: new Date(),
        },
      });
      if (chargeId) await this.applyToCharge(tx, chargeId, Number(trx.amount));
      if (cashbox) {
        await this.accounting.recordMovement(
          {
            buildingId: trx.buildingId,
            cashboxId: cashbox.id,
            entryType: LedgerEntryType.CREDIT,
            refType: LedgerRefType.PAYMENT,
            refId: p.id,
            amount: Number(trx.amount),
            description: 'پرداخت آنلاین شارژ',
          },
          tx,
        );
      }
      return p;
    });

    return { success: true, message: verify.message, refId: verify.refId, receiptNo: payment.receiptNo, paymentId: payment.id };
  }

  async list(buildingId: string, q: PaginationQueryDto & { unitId?: string; method?: string }) {
    const where: any = { buildingId, deletedAt: null };
    if (q.unitId) where.unitId = q.unitId;
    if (q.method) where.method = q.method;
    const [rows, total, sumAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          unit: { select: { code: true } },
          resident: { select: { fullName: true } },
        },
        orderBy: { paidAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);
    const data = rows.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      unitCode: p.unit?.code,
      payer: p.resident?.fullName,
      amount: Number(p.amount),
      method: p.method,
      type: p.type,
      status: p.status,
      paidAt: toJalali(p.paidAt),
    }));
    return { data, meta: { ...buildMeta(total, q.page, q.limit), totalAmount: Number(sumAgg._sum.amount ?? 0) } };
  }

  async getOne(id: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: {
        unit: { select: { code: true } },
        resident: { select: { fullName: true, mobile: true } },
        building: { select: { name: true } },
        charge: { include: { period: { select: { title: true } } } },
        transaction: true,
      },
    });
    if (!p) throw new NotFoundException('پرداخت یافت نشد.');
    return { ...p, amount: Number(p.amount), paidAtJalali: toJalali(p.paidAt) };
  }

  private methodLabel(m: PaymentMethod): string {
    return { CASH: 'نقدی', CARD: 'کارت‌خوان', TRANSFER: 'واریز', ONLINE: 'آنلاین' }[m] ?? m;
  }
}
