import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ChargesService } from '@/modules/charges/charges.service';
import { ReportsService } from '@/modules/reports/reports.service';
import { formatRial, formatToman } from '@/common/utils/money.util';
import { jalaliYearMonth, jalaliMonthName, toFaDigits } from '@/common/utils/jalali.util';
import { detectIntent, normalizeFa, IntentKey } from './intents';

export interface AnalyticsAnswer {
  understood: boolean;
  intent?: IntentKey;
  answer: string; // پاسخ خلاصه‌ی فارسی
  data?: unknown; // داده‌ی ساختاریافته برای نمایش جدول/نمودار
}

/**
 * موتور تحلیل هوشمند فارسی — قطعی (deterministic) و مبتنی بر داده‌ی واقعی.
 * پرسش کاربر را به یک intent نگاشت کرده و کوئری متناظر را اجرا می‌کند.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charges: ChargesService,
    private readonly reports: ReportsService,
  ) {}

  async ask(buildingId: string, question: string): Promise<AnalyticsAnswer> {
    const intent = detectIntent(question);
    if (!intent) {
      return {
        understood: false,
        answer:
          'متوجه پرسش نشدم. می‌توانید درباره‌ی این موارد بپرسید: بدهکاران، موجودی صندوق، هزینه‌ها، خلاصه مالی، پیشنهاد شارژ یا وضعیت تعمیرات.',
      };
    }
    switch (intent) {
      case 'DEBTORS':
        return this.debtors(buildingId, intent);
      case 'CASHBOX_BALANCE':
        return this.cashbox(buildingId, intent);
      case 'TOP_LATE_PAYERS':
        return this.topLatePayers(buildingId, intent);
      case 'SUGGEST_CHARGE':
        return this.suggestCharge(buildingId, intent);
      case 'OPEN_MAINTENANCE':
        return this.openMaintenance(buildingId, intent);
      case 'FINANCE_SUMMARY':
        return this.financeSummary(buildingId, intent);
      case 'INCOME_THIS_MONTH':
        return this.thisMonth(buildingId, intent, 'income');
      case 'EXPENSE_THIS_MONTH':
        return this.thisMonth(buildingId, intent, 'expense');
      case 'EXPENSE_BY_KEYWORD':
        return this.expenseByKeyword(buildingId, question, intent);
      default:
        return { understood: false, answer: 'این پرسش هنوز پشتیبانی نمی‌شود.' };
    }
  }

  private async debtors(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const list = await this.charges.debtors(buildingId);
    if (list.length === 0) {
      return { understood: true, intent, answer: 'در حال حاضر هیچ واحد بدهکاری وجود ندارد. ✅' };
    }
    const total = list.reduce((s, r) => s + r.totalDebt, 0);
    const top = list.slice(0, 5).map((r) => `واحد ${r.unitCode} (${formatRial(r.totalDebt)})`).join('، ');
    return {
      understood: true,
      intent,
      answer: `در مجموع ${toFaDigits(list.length)} واحد بدهکار با مجموع بدهی ${formatRial(total)} وجود دارد. بیشترین بدهی: ${top}.`,
      data: list,
    };
  }

  private async cashbox(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const boxes = await this.prisma.cashbox.findMany({ where: { buildingId, deletedAt: null } });
    if (boxes.length === 0) {
      return { understood: true, intent, answer: 'هنوز صندوقی برای این ساختمان تعریف نشده است.' };
    }
    const total = boxes.reduce((s, b) => s + Number(b.balance), 0);
    const detail = boxes.map((b) => `${b.name}: ${formatRial(Number(b.balance))}`).join(' | ');
    return {
      understood: true,
      intent,
      answer: `موجودی کل صندوق‌ها ${formatRial(total)} (${formatToman(total)}) است. (${detail})`,
      data: boxes.map((b) => ({ name: b.name, balance: Number(b.balance) })),
    };
  }

  private async topLatePayers(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const list = await this.charges.debtors(buildingId);
    const sorted = [...list].sort((a, b) => b.periods - a.periods).slice(0, 5);
    if (sorted.length === 0) {
      return { understood: true, intent, answer: 'هیچ واحدی تاخیر پرداخت ندارد.' };
    }
    const text = sorted.map((r) => `واحد ${r.unitCode} با ${toFaDigits(r.periods)} دوره‌ی معوق`).join('، ');
    return {
      understood: true,
      intent,
      answer: `واحدهایی با بیشترین تاخیر پرداخت: ${text}.`,
      data: sorted,
    };
  }

  private async suggestCharge(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    // پیشنهاد بر اساس میانگین هزینه‌ی ۳ ماه اخیر تقسیم بر تعداد واحدها + ۱۰٪ ذخیره
    const chart = await this.reports.incomeExpenseChart(buildingId, 3);
    const avgExpense = chart.reduce((s, c) => s + c.expense, 0) / (chart.length || 1);
    const units = await this.prisma.unit.count({ where: { buildingId, deletedAt: null } });
    if (units === 0) {
      return { understood: true, intent, answer: 'برای پیشنهاد شارژ، ابتدا واحدها را تعریف کنید.' };
    }
    const perUnit = Math.ceil((avgExpense * 1.1) / units / 10000) * 10000; // گرد به ۱۰هزار ریال
    return {
      understood: true,
      intent,
      answer:
        avgExpense > 0
          ? `بر اساس میانگین هزینه‌ی ۳ ماه اخیر و با ۱۰٪ ذخیره، شارژ پیشنهادی هر واحد حدود ${formatRial(perUnit)} است. این عدد را با توجه به متراژ/نفرات می‌توانید تعدیل کنید.`
          : 'داده‌ی هزینه‌ی کافی برای پیشنهاد شارژ موجود نیست. پس از ثبت چند ماه هزینه دوباره بپرسید.',
      data: { avgExpense, units, perUnit },
    };
  }

  private async openMaintenance(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const grouped = await this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { buildingId, deletedAt: null, status: { in: ['SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS'] } },
      _count: true,
    });
    const total = grouped.reduce((s, g) => s + g._count, 0);
    if (total === 0) {
      return { understood: true, intent, answer: 'هیچ درخواست تعمیرات بازی وجود ندارد. ✅' };
    }
    const labels: Record<string, string> = {
      SUBMITTED: 'ثبت‌شده', REVIEWING: 'در حال بررسی', APPROVED: 'تاییدشده', IN_PROGRESS: 'در حال انجام',
    };
    const detail = grouped.map((g) => `${labels[g.status]}: ${toFaDigits(g._count)}`).join('، ');
    return {
      understood: true,
      intent,
      answer: `در مجموع ${toFaDigits(total)} درخواست تعمیرات باز وجود دارد. (${detail})`,
      data: grouped.map((g) => ({ status: g.status, count: g._count })),
    };
  }

  private async financeSummary(buildingId: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const chart = await this.reports.incomeExpenseChart(buildingId, 3);
    const income = chart.reduce((s, c) => s + c.income, 0);
    const expense = chart.reduce((s, c) => s + c.expense, 0);
    const balance = income - expense;
    return {
      understood: true,
      intent,
      answer: `در ۳ ماه اخیر مجموع درآمد ${formatRial(income)} و مجموع هزینه ${formatRial(expense)} بوده است؛ تراز ${balance >= 0 ? 'مثبت' : 'منفی'} ${formatRial(Math.abs(balance))}.`,
      data: chart,
    };
  }

  private async thisMonth(buildingId: string, intent: IntentKey, kind: 'income' | 'expense'): Promise<AnalyticsAnswer> {
    const { year, month } = jalaliYearMonth(new Date());
    const f = await this.reports.monthlyFinance(buildingId, year, month);
    const value = kind === 'income' ? f.totalIncome : f.totalExpense;
    const label = kind === 'income' ? 'درآمد' : 'هزینه';
    return {
      understood: true,
      intent,
      answer: `${label} ${jalaliMonthName(month)} ${toFaDigits(year)} برابر ${formatRial(value)} است.`,
      data: f,
    };
  }

  private async expenseByKeyword(buildingId: string, question: string, intent: IntentKey): Promise<AnalyticsAnswer> {
    const q = normalizeFa(question);
    // استخراج نام دسته از متن (آسانسور، نظافت، تاسیسات، نگهبانی...)
    const known = ['آسانسور', 'نظافت', 'تاسیسات', 'نگهبانی', 'سرایدار', 'برق', 'آب', 'گاز', 'باغبانی', 'تعمیرات'];
    const keyword = known.find((k) => q.includes(normalizeFa(k)));
    const { year } = jalaliYearMonth(new Date());
    const byCat = await this.reports.expenseByCategory(buildingId, year);
    if (!keyword) {
      const total = byCat.reduce((s, c) => s + c.amount, 0);
      return {
        understood: true,
        intent,
        answer: `مجموع هزینه‌های امسال ${formatRial(total)} است. برای یک دسته‌ی خاص، نام آن را ذکر کنید (مثلاً «هزینه آسانسور امسال چقدر بوده؟»).`,
        data: byCat,
      };
    }
    const match = byCat.find((c) => normalizeFa(c.category ?? '').includes(normalizeFa(keyword)));
    if (!match || match.amount === 0) {
      return { understood: true, intent, answer: `برای دسته‌ی «${keyword}» در سال جاری هزینه‌ای ثبت نشده است.` };
    }
    return {
      understood: true,
      intent,
      answer: `هزینه‌ی «${keyword}» در سال ${toFaDigits(year)} برابر ${formatRial(match.amount)} بوده است.`,
      data: match,
    };
  }
}
