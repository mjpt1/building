import { Module, Controller, Get, Param, Injectable } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ReportsService } from '@/modules/reports/reports.service';
import { ReportsModule } from '@/modules/reports/reports.module';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { toJalali, jalaliYearMonth } from '@/common/utils/jalali.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  /** داشبورد مدیر: شاخص‌های کلیدی + نمودار + پرداخت‌های اخیر + هشدارها */
  async managerDashboard(buildingId: string) {
    const { year, month } = jalaliYearMonth(new Date());
    const [
      cashboxes,
      finance,
      unitsCount,
      openMaintenance,
      recentPayments,
      chart,
    ] = await Promise.all([
      this.prisma.cashbox.findMany({ where: { buildingId, deletedAt: null }, select: { balance: true } }),
      this.reports.monthlyFinance(buildingId, year, month),
      this.prisma.unit.count({ where: { buildingId, deletedAt: null } }),
      this.prisma.maintenanceRequest.count({
        where: { buildingId, deletedAt: null, status: { in: ['SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS'] } },
      }),
      this.prisma.payment.findMany({
        where: { buildingId, deletedAt: null, status: 'CONFIRMED' },
        include: { unit: { select: { code: true } }, resident: { select: { fullName: true } } },
        orderBy: { paidAt: 'desc' },
        take: 8,
      }),
      this.reports.incomeExpenseChart(buildingId, 6),
    ]);

    // واحدهای بدهکار
    const debtorCharges = await this.prisma.charge.findMany({
      where: { period: { buildingId }, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      select: { unitId: true, amount: true, paidAmount: true, penaltyAmount: true },
    });
    const debtorUnits = new Set<string>();
    let totalDebt = 0;
    for (const c of debtorCharges) {
      const remaining = Number(c.amount) + Number(c.penaltyAmount) - Number(c.paidAmount);
      if (remaining > 0) { debtorUnits.add(c.unitId); totalDebt += remaining; }
    }

    const cashboxTotal = cashboxes.reduce((s, c) => s + Number(c.balance), 0);

    const alerts: { level: string; text: string }[] = [];
    if (debtorUnits.size > 0) {
      alerts.push({ level: 'warning', text: `${debtorUnits.size} واحد بدهکار با مجموع بدهی قابل توجه.` });
    }
    if (openMaintenance > 0) {
      alerts.push({ level: 'info', text: `${openMaintenance} درخواست تعمیرات باز وجود دارد.` });
    }
    if (finance.balance < 0) {
      alerts.push({ level: 'danger', text: 'هزینه‌های این ماه از درآمد بیشتر شده است.' });
    }

    return {
      cards: {
        cashboxBalance: cashboxTotal,
        monthIncome: finance.totalIncome,
        monthExpense: finance.totalExpense,
        unitsCount,
        debtorUnitsCount: debtorUnits.size,
        totalDebt,
        openMaintenance,
      },
      chart,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        unitCode: p.unit?.code,
        payer: p.resident?.fullName,
        amount: Number(p.amount),
        method: p.method,
        paidAt: toJalali(p.paidAt),
      })),
      alerts,
    };
  }

  /** داشبورد ساکن: شارژ جاری، بدهی، تعمیرات، اطلاعیه‌های اخیر */
  async residentDashboard(userId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { userId, deletedAt: null },
      include: { currentUnits: { select: { id: true, code: true, buildingId: true } } },
    });
    if (!resident) return { hasUnit: false };

    const unitIds = resident.currentUnits.map((u) => u.id);
    const charges = await this.prisma.charge.findMany({
      where: { unitId: { in: unitIds } },
      include: { period: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    let totalDebt = 0;
    for (const c of charges) {
      if (['PENDING', 'PARTIAL', 'OVERDUE'].includes(c.status)) {
        totalDebt += Number(c.amount) + Number(c.penaltyAmount) - Number(c.paidAmount);
      }
    }
    const maintenance = await this.prisma.maintenanceRequest.count({
      where: { residentId: resident.id, status: { in: ['SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS'] } },
    });
    const announcements = await this.prisma.announcement.findMany({
      where: { buildingId: resident.currentUnits[0]?.buildingId, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, publishedAt: true },
    });

    return {
      hasUnit: true,
      units: resident.currentUnits.map((u) => u.code),
      totalDebt: Math.max(0, totalDebt),
      openMaintenance: maintenance,
      charges: charges.map((c) => ({
        id: c.id,
        period: c.period.title,
        amount: Number(c.amount),
        remaining: Math.max(0, Number(c.amount) + Number(c.penaltyAmount) - Number(c.paidAmount)),
        status: c.status,
      })),
      announcements: announcements.map((a) => ({ id: a.id, title: a.title, publishedAt: toJalali(a.publishedAt) })),
    };
  }
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('manager/:buildingId')
  @Permissions('report:read')
  manager(@Param('buildingId') b: string) {
    return this.svc.managerDashboard(b);
  }

  @Get('resident')
  resident(@CurrentUser('id') userId: string) {
    return this.svc.residentDashboard(userId);
  }
}

@Module({
  imports: [ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
