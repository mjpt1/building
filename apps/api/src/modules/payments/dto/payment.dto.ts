import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentMethod, PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsOptional() @IsString() chargeId?: string;
  @IsOptional() @IsString() unitId?: string;
  @IsOptional() @IsString() residentId?: string;
  @IsOptional() @IsString() cashboxId?: string;
  @Type(() => Number) @IsNumber() @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد.' }) amount!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsEnum(PaymentType) type?: PaymentType;
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsString() description?: string;
}

export class InitiateOnlineDto {
  @IsString() chargeId!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) amount?: number; // پرداخت خرد؛ پیش‌فرض کل مانده
}
