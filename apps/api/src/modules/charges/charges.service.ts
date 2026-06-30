import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ChargePeriodStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { parseJalaliInput, toJalali, jalaliPeriodTitle } from '@/common/utils/jalali.util';
import {
  calculateCharges,
  calculatePenalty,
  UnitInput,
  CalcConfig,
} from './charge-calculator';
import { CreateChargePeriodDto, PreviewChargeDto } from './dto/charge.dto';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async unitsOf(buildingId: string): Promise<UnitInput[]> {
    const units = await this.prisma.unit.findMany({
      where: { buildingId, deletedAt: null },
      select: { id: true, code: true, area: true, residentsCount: true, coefficient: true },
    });
    return units.map((u) => ({
      unitId: u.id,
      code: u.code,
      area: Number(u.area),
      residentsCount: u.residentsCount,
      coefficient: Number(u.coefficient),
    }));
  }

  private toConfig(dto: CreateChargePeriodDto): CalcConfig {
    return {
      method: dto.method,
      baseAmount: dto.baseAmount,
      items: (dto.items ?? []).map((i) => ({ title: i.title, method: i.method, amount: i.amount })),
      formula: dto.formula,
    };
  }

  /** پیش‌نمایش محاسبه بدون ذخیره — برای بازبینی مدیر */
  async preview(buildingId: string, dto: PreviewChargeDto) {
    const units = await this.unitsOf(buildingId);
    if (units.length === 0) throw new BadRequestException('این ساختمان واحدی ندارد.');
    const result = calculateCharges(units, this.toConfig(dto));
    const total = result.reduce((s, r) => s + r.amount, 0);
    return {
      period: jalaliPeriodTitle(dto.year, dto.month),
      unitsCount: units.length,
      total,
      charges: result,
    };
  }

  /** ایجاد دوره‌ی شارژ به‌صورت پیش‌نویس همراه با محاسبه‌ی همه‌ی واحدها */
  async createPeriod(buildingId: string, dto: CreateChargePeriodDto, userId: string) {
    const existing = await this.prisma.chargePeriod.findUnique({
      where: { buildingId_year_month: { buildingId, year: dto.year, month: dto.month } },
    });
    if (existing) {
      throw new ConflictException('برای این ماه قبلاً دوره‌ی شارژ ثبت شده است.');
    }

    const units = await this.unitsOf(buildingId);
    if (units.length === 0) throw new BadRequestException('این ساختمان واحدی ندارد.');

    const result = calculateCharges(units, this.toConfig(dto));
    const total = result.reduce((s, r) => s + r.amount, 0);
    const dueDate = parseJalaliInput(dto.dueDate);
    const title = dto.title ?? `شارژ ${jalaliPeriodTitle(dto.year, dto.month)}`;

    const period = await this.prisma.$transaction(async (tx) => {
      const p = await tx.chargePeriod.create({
        data: {
          buildingId,
          title,
          year: dto.year,
          month: dto.month,
          method: dto.method,
          status: ChargePeriodStatus.DRAFT,
          baseAmount: dto.baseAmount,
          totalAmount: total,
          penaltyPerDay: dto.penaltyPerDay,
          dueDate,
          formula: (dto.formula as any) ?? undefined,
          description: dto.description,
          createdById: userId,
          items: {
            create: (dto.items ?? []).map((i, idx) => ({
              title: i.title,
              method: i.method,
              amount: i.amount,
              order: idx,
            })),
          },
        },
      });
      await tx.charge.createMany({
        data: result.map((r) => ({
          periodId: p.id,
          unitId: r.unitId,
          amount: r.amount,
          dueDate,
          breakdown: r.breakdown as any,
        })),
      });
      return p;
    });

    await this.audit.log({
      userId,
      buildingId,
      action: 'CREATE',
      entity: 'ChargePeriod',
      entityId: period.id,
      after: { title, total },
    });
    return this.getPeriod(period.id);
  }

  /** تایید نهایی دوره و ابلاغ به ساکنین (ارسال اعلان) */
  async approvePeriod(periodId: string, userId: string) {
    const period = await this.prisma.chargePeriod.findUnique({
      where: { id: periodId },
      include: { charges: { include: { unit: { include: { currentResident: true } } } } },
    });
    if (!period) throw new NotFoundException('دوره یافت نشد.');
    if (period.status !== ChargePeriodStatus.DRAFT) {
      throw new BadRequestException('فقط دوره‌ی پیش‌نویس قابل تایید است.');
    }

    await this.prisma.chargePeriod.update({
      where: { id: periodId },
      data: { status: ChargePeriodStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
    });

    // اعلان به ساکنینی که حساب کاربری دارند
    for (const ch of period.charges) {
      const userId2 = ch.unit.currentResident?.userId;
      if (userId2) {
        await this.notifications.create({
          userId: userId2,
          type: 'CHARGE',
          title: `شارژ جدید: ${period.title}`,
          body: `مبلغ شارژ واحد ${ch.unit.code} ثبت شد. لطفاً تا سررسید پرداخت کنید.`,
          data: { chargeId: ch.id, periodId },
        });
      }
    }

    await this.audit.log({
      userId,
      buildingId: period.buildingId,
      action: 'APPROVE',
      entity: 'ChargePeriod',
      entityId: periodId,
    });
    return { message: 'دوره‌ی شارژ تایید و ابلاغ شد.' };
  }

  async listPeriods(buildingId: string, q: PaginationQueryDto) {
    const where = { buildingId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.chargePeriod.findMany({
        where,
        include: { _count: { select: { charges: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.chargePeriod.count({ where }),
    ]);
    const data = rows.map((p) => ({
      id: p.id,
      title: p.title,
      year: p.year,
      month: p.month,
      method: p.method,
      status: p.status,
      totalAmount: Number(p.totalAmount),
      dueDate: toJalali(p.dueDate),
      unitsCount: p._count.charges,
    }));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }

  async getPeriod(periodId: string) {
    const p = await this.prisma.chargePeriod.findUnique({
      where: { id: periodId },
      include: {
        items: { orderBy: { order: 'asc' } },
        charges: {
          include: { unit: { select: { code: true, area: true } } },
          orderBy: { unit: { code: 'asc' } },
        },
      },
    });
    if (!p) throw new NotFoundException('دوره یافت نشد.');
    return {
      ...p,
      totalAmount: Number(p.totalAmount),
      dueDateJalali: toJalali(p.dueDate),
      charges: p.charges.map((c) => ({
        id: c.id,
        unitCode: c.unit.code,
        amount: Number(c.amount),
        penaltyAmount: Number(c.penaltyAmount),
        paidAmount: Number(c.paidAmount),
        status: c.status,
        breakdown: c.breakdown,
      })),
    };
  }

  /** فهرست شارژهای یک واحد (برای پنل ساکن) */
  async unitCharges(unitId: string) {
    const charges = await this.prisma.charge.findMany({
      where: { unitId },
      include: { period: { select: { title: true, year: true, month: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return charges.map((c) => {
      const penalty = calculatePenalty(c.dueDate, 0); // جریمه‌ی به‌روز در زمان پرداخت محاسبه می‌شود
      return {
        id: c.id,
        period: c.period.title,
        amount: Number(c.amount),
        penaltyAmount: Number(c.penaltyAmount) + penalty,
        paidAmount: Number(c.paidAmount),
        remaining: Math.max(0, Number(c.amount) + Number(c.penaltyAmount) - Number(c.paidAmount)),
        status: c.status,
        dueDate: toJalali(c.dueDate),
      };
    });
  }

  /** گزارش بدهکاران یک ساختمان */
  async debtors(buildingId: string) {
    const charges = await this.prisma.charge.findMany({
      where: {
        period: { buildingId },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        unit: {
          select: {
            code: true,
            currentResident: { select: { fullName: true, mobile: true } },
            owner: { select: { fullName: true, mobile: true } },
          },
        },
        period: { select: { title: true } },
      },
    });

    const byUnit = new Map<string, any>();
    for (const c of charges) {
      const key = c.unit.code;
      const remaining = Number(c.amount) + Number(c.penaltyAmount) - Number(c.paidAmount);
      if (!byUnit.has(key)) {
        byUnit.set(key, {
          unitCode: c.unit.code,
          name: c.unit.currentResident?.fullName ?? c.unit.owner?.fullName ?? '—',
          mobile: c.unit.currentResident?.mobile ?? c.unit.owner?.mobile ?? '',
          totalDebt: 0,
          periods: 0,
        });
      }
      const row = byUnit.get(key);
      row.totalDebt += Math.max(0, remaining);
      row.periods += 1;
    }
    return [...byUnit.values()]
      .filter((r) => r.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }
}
