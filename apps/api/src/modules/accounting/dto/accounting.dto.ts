import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum, Min, IsNotEmpty } from 'class-validator';
import { CashboxType } from '@prisma/client';

export class CreateCashboxDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(CashboxType) type!: CashboxType;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @Type(() => Number) @IsNumber() initialBalance?: number;
}

export class CreateIncomeDto {
  @IsString() @IsNotEmpty({ message: 'عنوان درآمد الزامی است.' }) title!: string;
  @Type(() => Number) @IsNumber() @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد.' }) amount!: number;
  @IsString() receivedAt!: string;
  @IsOptional() @IsString() cashboxId?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() attachmentId?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateExpenseDto {
  @IsString() @IsNotEmpty({ message: 'عنوان هزینه الزامی است.' }) title!: string;
  @Type(() => Number) @IsNumber() @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد.' }) amount!: number;
  @IsString() spentAt!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() cashboxId?: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() attachmentId?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() parentId?: string;
}
