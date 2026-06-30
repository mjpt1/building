import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { OccupancyStatus } from '@prisma/client';

export class CreateBuildingDto {
  @IsString() @IsNotEmpty({ message: 'نام ساختمان الزامی است.' }) name!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() managerName?: string;
  @IsOptional() @IsString() managerPhone?: string;
}

export class UpdateBuildingDto extends CreateBuildingDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateFloorDto {
  @Type(() => Number) @IsInt() number!: number;
  @IsOptional() @IsString() title?: string;
}

export class CreateUnitDto {
  @IsString() @IsNotEmpty({ message: 'شماره واحد الزامی است.' }) code!: string;
  @IsOptional() @IsString() floorId?: string;
  @Type(() => Number) @IsNumber() @Min(0) area = 0;
  @Type(() => Number) @IsInt() @Min(0) residentsCount = 0;
  @IsOptional() @IsEnum(OccupancyStatus) occupancyStatus?: OccupancyStatus;
  @IsOptional() @IsBoolean() hasParking?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() parkingCount?: number;
  @IsOptional() @IsBoolean() hasStorage?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() storageCount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() coefficient?: number;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() currentResidentId?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateUnitDto extends CreateUnitDto {}
