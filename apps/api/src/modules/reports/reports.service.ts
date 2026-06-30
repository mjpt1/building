import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { jalaliMonthRange, jalaliMonthName, jalaliYearMonth } from '@/common/utils/jalali.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** خلاصه مالی یک ماه جلالی: درآمد، هزینه، تراز */
  async monthlyFinance(buildingId: string, year: number, month: number) {
    const { start, end } = jalaliMonthRange(year, month);
    const [income, expense] = await Promise.all([
      this.prisma.incomeRecord.aggregate({
        where: { buildingId, deletedAt: null, receivedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.expenseRecord.aggregate({
        where: { buildingId, deletedAt: null, spentAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);
    return {
      period: `${jalaliMonthName(month)} ${year}`,
      year,
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  /** نمودار ۱۲ ماه اخیر: درآمد و هزینه به‌تفکیک ماه جلالی */
  async incomeExpenseChart(buildingId: string, months = 12) {
    const now = new Date();
    const series: any[] = [];
    let { year, month } = jalaliYearMonth(now);
    const points: { year: number; month: number }[] = [];
    for (let i = 0; i < months; i++) {
      points.unshift({ year, month });
      month -= 1;
      if (month < 1) { month = 12; year -= 1; }
    }
    for (const p of points) {
      const f = await this.monthlyFinance(buildingId, p.year, p.month);
      series.push({ label: jalaliMonthName(p.month), income: f.totalIncome, expense: f.totalExpense });
    }
    return series;
  }

  /** گزارش سالانه: جمع ۱۲ ماه + ریز ماهانه */
  async yearlyFinance(buildingId: string, year: number) {
    const months: any[] = [];
    let totalIncome = 0;
    let totalExpense = 0;
    for (let m = 1; m <= 12; m++) {
      const f = await this.monthlyFinance(buildingId, year, m);
      totalIncome += f.totalIncome;
      totalExpense += f.totalExpense;
      months.push(f);
    }
    return { year, totalIncome, totalExpense, balance: totalIncome - totalExpense, months };
  }

  /** هزینه‌ها به‌تفکیک دسته (برای نمودار دایره‌ای) */
  async expenseByCategory(buildingId: string, year?: number) {
    const where: any = { buildingId, deletedAt: null };
    if (year) {
      const { start } = jalaliMonthRange(year, 1);
      const { end } = jalaliMonthRange(year, 12);
      where.spentAt = { gte: start, lte: end };
    }
    const grouped = await this.prisma.expenseRecord.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
    });
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: grouped.map((g) => g.categoryId).filter(Boolean) as string[] } },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.title]));
    return grouped
      .map((g) => ({
        category: g.categoryId ? catMap.get(g.categoryId) ?? 'سایر' : 'بدون دسته',
        amount: Number(g._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /** خلاصه‌ی پرداخت‌ها در بازه */
  async paymentsSummary(buildingId: string, year: number, month: number) {
    const { start, end } = jalaliMonthRange(year, month);
    const grouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { buildingId, deletedAt: null, paidAt: { gte: start, lte: end }, status: 'CONFIRMED' },
      _sum: { amount: true },
      _count: true,
    });
    return grouped.map((g) => ({
      method: g.method,
      count: g._count,
      amount: Number(g._sum.amount ?? 0),
    }));
  }
}
