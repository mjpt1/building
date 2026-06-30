import { Module, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('buildings/:buildingId/reports')
class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('monthly')
  @Permissions('report:read')
  monthly(@Param('buildingId') b: string, @Query('year') year: string, @Query('month') month: string) {
    return this.svc.monthlyFinance(b, Number(year), Number(month));
  }

  @Get('yearly')
  @Permissions('report:read')
  yearly(@Param('buildingId') b: string, @Query('year') year: string) {
    return this.svc.yearlyFinance(b, Number(year));
  }

  @Get('income-expense-chart')
  @Permissions('report:read')
  chart(@Param('buildingId') b: string, @Query('months') months?: string) {
    return this.svc.incomeExpenseChart(b, months ? Number(months) : 12);
  }

  @Get('expense-by-category')
  @Permissions('report:read')
  byCategory(@Param('buildingId') b: string, @Query('year') year?: string) {
    return this.svc.expenseByCategory(b, year ? Number(year) : undefined);
  }

  @Get('payments-summary')
  @Permissions('report:read')
  payments(@Param('buildingId') b: string, @Query('year') year: string, @Query('month') month: string) {
    return this.svc.paymentsSummary(b, Number(year), Number(month));
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
