import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LedgerEntryType, LedgerRefType, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { parseJalaliInput, toJalali } from '@/common/utils/jalali.util';
import {
  CreateCashboxDto,
  CreateIncomeDto,
  CreateExpenseDto,
  CreateCategoryDto,
} from './dto/accounting.dto';

export interface LedgerMovement {
  buildingId: string;
  cashboxId: string;
  entryType: LedgerEntryType;
  refType: LedgerRefType;
  refId?: string;
  amount: number;
  description?: string;
  occurredAt?: Date;
  createdById?: string;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** صندوق پیش‌فرض ساختمان (اولین صندوق فعال) */
  private async defaultCashbox(buildingId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const cb = await client.cashbox.findFirst({
      where: { buildingId, deletedAt: null, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!cb) throw new BadRequestException('برای این ساختمان صندوقی تعریف نشده است.');
    return cb;
  }

  /**
   * ثبت حرکت در دفتر کل + به‌روزرسانی مانده‌ی صندوق (اتمیک).
   * این متد توسط درآمد/هزینه/پرداخت استفاده می‌شود.
   */
  async recordMovement(m: LedgerMovement, tx?: Prisma.TransactionClient) {
    const run = async (client: Prisma.TransactionClient) => {
      const cashbox = await client.cashbox.findUnique({ where: { id: m.cashboxId } });
      if (!cashbox) throw new NotFoundException('صندوق یافت نشد.');
      const delta = m.entryType === LedgerEntryType.CREDIT ? m.amount : -m.amount;
      const balanceAfter = Number(cashbox.balance) + delta;
      await client.cashbox.update({
        where: { id: m.cashboxId },
        data: { balance: balanceAfter },
      });
      return client.ledgerEntry.create({
        data: {
          buildingId: m.buildingId,
          cashboxId: m.cashboxId,
          entryType: m.entryType,
          refType: m.refType,
          refId: m.refId,
          amount: m.amount,
          balanceAfter,
          description: m.description,
          occurredAt: m.occurredAt ?? new Date(),
          createdById: m.createdById,
        },
      });
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // ───────────── صندوق‌ها ─────────────
  async listCashboxes(buildingId: string) {
    return this.prisma.cashbox.findMany({
      where: { buildingId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCashbox(buildingId: string, dto: CreateCashboxDto) {
    const count = await this.prisma.cashbox.count({ where: { buildingId, deletedAt: null } });
    return this.prisma.cashbox.create({
      data: {
        buildingId,
        name: dto.name,
        type: dto.type,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        initialBalance: dto.initialBalance ?? 0,
        balance: dto.initialBalance ?? 0,
        isDefault: count === 0,
      },
    });
  }

  async cashboxBalance(buildingId: string) {
    const boxes = await this.listCashboxes(buildingId);
    const total = boxes.reduce((s, b) => s + Number(b.balance), 0);
    return { total, boxes: boxes.map((b) => ({ id: b.id, name: b.name, balance: Number(b.balance) })) };
  }

  // ───────────── دسته‌بندی هزینه ─────────────
  async listCategories(buildingId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { OR: [{ buildingId }, { buildingId: null }] },
      orderBy: { title: 'asc' },
    });
  }

  createCategory(buildingId: string, dto: CreateCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: { buildingId, title: dto.title, parentId: dto.parentId },
    });
  }

  // ───────────── درآمد ─────────────
  async createIncome(buildingId: string, dto: CreateIncomeDto, userId: string) {
    const cashbox = dto.cashboxId
      ? await this.prisma.cashbox.findUnique({ where: { id: dto.cashboxId } })
      : await this.defaultCashbox(buildingId);
    if (!cashbox) throw new NotFoundException('صندوق یافت نشد.');
    const receivedAt = parseJalaliInput(dto.receivedAt);

    const income = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.incomeRecord.create({
        data: {
          buildingId,
          cashboxId: cashbox.id,
          title: dto.title,
          source: dto.source,
          amount: dto.amount,
          receivedAt,
          description: dto.description,
          attachmentId: dto.attachmentId,
          recordedById: userId,
        },
      });
      await this.recordMovement(
        {
          buildingId,
          cashboxId: cashbox.id,
          entryType: LedgerEntryType.CREDIT,
          refType: LedgerRefType.INCOME,
          refId: rec.id,
          amount: dto.amount,
          description: `درآمد: ${dto.title}`,
          occurredAt: receivedAt,
          createdById: userId,
        },
        tx,
      );
      return rec;
    });
    await this.audit.log({ userId, buildingId, action: 'CREATE', entity: 'Income', entityId: income.id, after: { amount: dto.amount } });
    return income;
  }

  // ───────────── هزینه ─────────────
  async createExpense(buildingId: string, dto: CreateExpenseDto, userId: string) {
    const cashbox = dto.cashboxId
      ? await this.prisma.cashbox.findUnique({ where: { id: dto.cashboxId } })
      : await this.defaultCashbox(buildingId);
    if (!cashbox) throw new NotFoundException('صندوق یافت نشد.');
    if (Number(cashbox.balance) < dto.amount) {
      // اجازه‌ی مانده‌ی منفی داده نمی‌شود مگر اخطار؛ اینجا فقط اخطار لاگ می‌کنیم و ادامه می‌دهیم
    }
    const spentAt = parseJalaliInput(dto.spentAt);

    const expense = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.expenseRecord.create({
        data: {
          buildingId,
          cashboxId: cashbox.id,
          categoryId: dto.categoryId,
          title: dto.title,
          amount: dto.amount,
          vendor: dto.vendor,
          spentAt,
          description: dto.description,
          attachmentId: dto.attachmentId,
          recordedById: userId,
        },
      });
      await this.recordMovement(
        {
          buildingId,
          cashboxId: cashbox.id,
          entryType: LedgerEntryType.DEBIT,
          refType: LedgerRefType.EXPENSE,
          refId: rec.id,
          amount: dto.amount,
          description: `هزینه: ${dto.title}`,
          occurredAt: spentAt,
          createdById: userId,
        },
        tx,
      );
      return rec;
    });
    await this.audit.log({ userId, buildingId, action: 'CREATE', entity: 'Expense', entityId: expense.id, after: { amount: dto.amount } });
    return expense;
  }

  // ───────────── فهرست‌ها ─────────────
  async listIncomes(buildingId: string, q: PaginationQueryDto) {
    const where: any = { buildingId, deletedAt: null };
    if (q.search) where.title = { contains: q.search };
    const [rows, total, sumAgg] = await Promise.all([
      this.prisma.incomeRecord.findMany({
        where,
        include: { cashbox: { select: { name: true } } },
        orderBy: { receivedAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.incomeRecord.count({ where }),
      this.prisma.incomeRecord.aggregate({ where, _sum: { amount: true } }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      amount: Number(r.amount),
      cashbox: r.cashbox?.name,
      receivedAt: toJalali(r.receivedAt),
    }));
    return { data, meta: { ...buildMeta(total, q.page, q.limit), totalAmount: Number(sumAgg._sum.amount ?? 0) } };
  }

  async listExpenses(buildingId: string, q: PaginationQueryDto & { categoryId?: string }) {
    const where: any = { buildingId, deletedAt: null };
    if (q.search) where.title = { contains: q.search };
    if (q.categoryId) where.categoryId = q.categoryId;
    const [rows, total, sumAgg] = await Promise.all([
      this.prisma.expenseRecord.findMany({
        where,
        include: { category: { select: { title: true } }, cashbox: { select: { name: true } } },
        orderBy: { spentAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.expenseRecord.count({ where }),
      this.prisma.expenseRecord.aggregate({ where, _sum: { amount: true } }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      vendor: r.vendor,
      amount: Number(r.amount),
      category: r.category?.title,
      cashbox: r.cashbox?.name,
      spentAt: toJalali(r.spentAt),
    }));
    return { data, meta: { ...buildMeta(total, q.page, q.limit), totalAmount: Number(sumAgg._sum.amount ?? 0) } };
  }

  async ledger(buildingId: string, q: PaginationQueryDto & { cashboxId?: string }) {
    const where: any = { buildingId };
    if (q.cashboxId) where.cashboxId = q.cashboxId;
    const [rows, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        include: { cashbox: { select: { name: true } } },
        orderBy: { occurredAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    const data = rows.map((e) => ({
      id: e.id,
      type: e.entryType,
      refType: e.refType,
      amount: Number(e.amount),
      balanceAfter: Number(e.balanceAfter),
      description: e.description,
      cashbox: e.cashbox.name,
      occurredAt: toJalali(e.occurredAt),
    }));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }
}
