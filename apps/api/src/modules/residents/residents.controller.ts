import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResidentsService } from './residents.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import {
  CreateResidentDto,
  UpdateResidentDto,
  CreateOwnerDto,
  UpdateOwnerDto,
  CreateLeaseDto,
} from './dto/resident.dto';

@ApiTags('residents')
@ApiBearerAuth()
@Controller()
export class ResidentsController {
  constructor(private readonly svc: ResidentsService) {}

  // ساکنین تحت یک ساختمان
  @Get('buildings/:buildingId/residents')
  @Permissions('resident:read')
  listResidents(@Param('buildingId') b: string, @Query() q: PaginationQueryDto) {
    return this.svc.listResidents(b, q);
  }

  @Post('buildings/:buildingId/residents')
  @Permissions('resident:create')
  createResident(@Param('buildingId') b: string, @Body() dto: CreateResidentDto) {
    return this.svc.createResident(b, dto);
  }

  @Get('residents/:id')
  @Permissions('resident:read')
  getResident(@Param('id') id: string) {
    return this.svc.getResident(id);
  }

  @Put('residents/:id')
  @Permissions('resident:update')
  updateResident(@Param('id') id: string, @Body() dto: UpdateResidentDto) {
    return this.svc.updateResident(id, dto);
  }

  @Delete('residents/:id')
  @Permissions('resident:delete')
  removeResident(@Param('id') id: string) {
    return this.svc.removeResident(id);
  }

  // مالکین
  @Get('buildings/:buildingId/owners')
  @Permissions('owner:read')
  listOwners(@Param('buildingId') b: string, @Query() q: PaginationQueryDto) {
    return this.svc.listOwners(b, q);
  }

  @Post('buildings/:buildingId/owners')
  @Permissions('owner:create')
  createOwner(@Param('buildingId') b: string, @Body() dto: CreateOwnerDto) {
    return this.svc.createOwner(b, dto);
  }

  @Get('owners/:id')
  @Permissions('owner:read')
  getOwner(@Param('id') id: string) {
    return this.svc.getOwner(id);
  }

  @Put('owners/:id')
  @Permissions('owner:update')
  updateOwner(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.svc.updateOwner(id, dto);
  }

  // قراردادها
  @Post('buildings/:buildingId/leases')
  @Permissions('resident:create')
  createLease(@Param('buildingId') b: string, @Body() dto: CreateLeaseDto) {
    return this.svc.createLease(b, dto);
  }

  @Get('units/:unitId/leases')
  @Permissions('resident:read')
  listLeases(@Param('unitId') unitId: string) {
    return this.svc.listLeases(unitId);
  }
}
