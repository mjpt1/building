import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import {
  CreateCashboxDto,
  CreateIncomeDto,
  CreateExpenseDto,
  CreateCategoryDto,
} from './dto/accounting.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('buildings/:buildingId')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  // صندوق‌ها
  @Get('cashboxes')
  @Permissions('accounting:read')
  cashboxes(@Param('buildingId') b: string) {
    return this.svc.listCashboxes(b);
  }

  @Post('cashboxes')
  @Permissions('cashbox:manage')
  createCashbox(@Param('buildingId') b: string, @Body() dto: CreateCashboxDto) {
    return this.svc.createCashbox(b, dto);
  }

  @Get('cashbox-balance')
  @Permissions('accounting:read')
  balance(@Param('buildingId') b: string) {
    return this.svc.cashboxBalance(b);
  }

  // دسته‌بندی هزینه
  @Get('expense-categories')
  @Permissions('accounting:read')
  categories(@Param('buildingId') b: string) {
    return this.svc.listCategories(b);
  }

  @Post('expense-categories')
  @Permissions('expense:create')
  createCategory(@Param('buildingId') b: string, @Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(b, dto);
  }

  // درآمد
  @Get('incomes')
  @Permissions('accounting:read')
  incomes(@Param('buildingId') b: string, @Query() q: PaginationQueryDto) {
    return this.svc.listIncomes(b, q);
  }

  @Post('incomes')
  @Permissions('income:create')
  createIncome(@Param('buildingId') b: string, @Body() dto: CreateIncomeDto, @CurrentUser('id') uid: string) {
    return this.svc.createIncome(b, dto, uid);
  }

  // هزینه
  @Get('expenses')
  @Permissions('accounting:read')
  expenses(@Param('buildingId') b: string, @Query() q: PaginationQueryDto & { categoryId?: string }) {
    return this.svc.listExpenses(b, q);
  }

  @Post('expenses')
  @Permissions('expense:create')
  createExpense(@Param('buildingId') b: string, @Body() dto: CreateExpenseDto, @CurrentUser('id') uid: string) {
    return this.svc.createExpense(b, dto, uid);
  }

  // دفتر کل
  @Get('ledger')
  @Permissions('accounting:read')
  ledger(@Param('buildingId') b: string, @Query() q: PaginationQueryDto & { cashboxId?: string }) {
    return this.svc.ledger(b, q);
  }
}
