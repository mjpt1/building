import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import {
  CreateMaintenanceDto,
  UpdateStatusDto,
  AssignDto,
  AddCommentDto,
} from './dto/maintenance.dto';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller()
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Post('buildings/:buildingId/maintenance')
  @Permissions('maintenance:create')
  create(@Param('buildingId') b: string, @Body() dto: CreateMaintenanceDto, @CurrentUser('id') uid: string) {
    return this.svc.create(b, dto, uid);
  }

  @Get('buildings/:buildingId/maintenance')
  @Permissions('maintenance:read')
  list(@Param('buildingId') b: string, @Query() q: PaginationQueryDto & { status?: string; priority?: string }) {
    return this.svc.list(b, q);
  }

  @Get('maintenance/:id')
  @Permissions('maintenance:read')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Patch('maintenance/:id/status')
  @Permissions('maintenance:update')
  status(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser('id') uid: string) {
    return this.svc.changeStatus(id, dto, uid);
  }

  @Patch('maintenance/:id/assign')
  @Permissions('maintenance:update')
  assign(@Param('id') id: string, @Body() dto: AssignDto, @CurrentUser('id') uid: string) {
    return this.svc.assign(id, dto, uid);
  }

  @Post('maintenance/:id/comments')
  @Permissions('maintenance:read')
  comment(@Param('id') id: string, @Body() dto: AddCommentDto, @CurrentUser('id') uid: string) {
    return this.svc.addComment(id, dto, uid);
  }
}
