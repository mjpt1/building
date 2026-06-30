import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { LeaseType } from '@prisma/client';

const MOBILE = /^09\d{9}$/;

export class CreateResidentDto {
  @IsString() @IsNotEmpty({ message: 'نام الزامی است.' }) fullName!: string;
  @Matches(MOBILE, { message: 'شماره موبایل نامعتبر است.' }) mobile!: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsString() moveInAt?: string; // تاریخ شمسی یا ISO
  @IsOptional() @IsString() notes?: string;
}
export class UpdateResidentDto extends CreateResidentDto {}

export class CreateOwnerDto {
  @IsString() @IsNotEmpty({ message: 'نام الزامی است.' }) fullName!: string;
  @Matches(MOBILE, { message: 'شماره موبایل نامعتبر است.' }) mobile!: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateOwnerDto extends CreateOwnerDto {}

export class CreateLeaseDto {
  @IsString() unitId!: string;
  @IsOptional() @IsString() residentId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsEnum(LeaseType) type!: LeaseType;
  @IsString() startDate!: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() depositAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() rentAmount?: number;
  @IsOptional() @IsString() description?: string;
}
