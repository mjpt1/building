import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ChargeMethod } from '@prisma/client';

export class ChargeItemDto {
  @IsString() title!: string;
  @IsEnum(ChargeMethod) method!: ChargeMethod;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
}

export class FormulaDto {
  @IsOptional() @Type(() => Number) @IsNumber() fixed?: number;
  @IsOptional() @Type(() => Number) @IsNumber() perArea?: number;
  @IsOptional() @Type(() => Number) @IsNumber() perPerson?: number;
  @IsOptional() @Type(() => Number) @IsNumber() perCoefficient?: number;
}

export class CreateChargePeriodDto {
  @Type(() => Number) @IsInt() @Min(1390) @Max(1500) year!: number; // سال جلالی
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number; // ماه جلالی
  @IsEnum(ChargeMethod) method!: ChargeMethod;
  @Type(() => Number) @IsNumber() @Min(0) baseAmount = 0;
  @Type(() => Number) @IsNumber() @Min(0) penaltyPerDay = 0;
  @IsString() dueDate!: string; // سررسید (شمسی یا ISO)
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChargeItemDto)
  items?: ChargeItemDto[];
  @IsOptional() @ValidateNested() @Type(() => FormulaDto) formula?: FormulaDto;
}

export class PreviewChargeDto extends CreateChargePeriodDto {}
