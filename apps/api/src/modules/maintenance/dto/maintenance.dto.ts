import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsNumber, IsNotEmpty, IsArray } from 'class-validator';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export class CreateMaintenanceDto {
  @IsString() @IsNotEmpty({ message: 'عنوان درخواست الزامی است.' }) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() unitId?: string;
  @IsOptional() @IsString() residentId?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsArray() attachmentIds?: string[];
}

export class UpdateStatusDto {
  @IsEnum(MaintenanceStatus) status!: MaintenanceStatus;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @Type(() => Number) @IsNumber() cost?: number;
}

export class AssignDto {
  @IsString() assignedToId!: string;
  @IsOptional() @IsString() comment?: string;
}

export class AddCommentDto {
  @IsString() @IsNotEmpty() body!: string;
}
