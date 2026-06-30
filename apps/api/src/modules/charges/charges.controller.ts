import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChargesService } from './charges.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { CreateChargePeriodDto, PreviewChargeDto } from './dto/charge.dto';

@ApiTags('charges')
@ApiBearerAuth()
@Controller()
export class ChargesController {
  constructor(private readonly svc: ChargesService) {}

  @Post('buildings/:buildingId/charges/preview')
  @Permissions('charge:create')
  preview(@Param('buildingId') b: string, @Body() dto: PreviewChargeDto) {
    return this.svc.preview(b, dto);
  }

  @Post('buildings/:buildingId/charges')
  @Permissions('charge:create')
  create(
    @Param('buildingId') b: string,
    @Body() dto: CreateChargePeriodDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.createPeriod(b, dto, userId);
  }

  @Get('buildings/:buildingId/charges')
  @Permissions('charge:read')
  list(@Param('buildingId') b: string, @Query() q: PaginationQueryDto) {
    return this.svc.listPeriods(b, q);
  }

  @Get('buildings/:buildingId/debtors')
  @Permissions('charge:read')
  debtors(@Param('buildingId') b: string) {
    return this.svc.debtors(b);
  }

  @Get('charge-periods/:id')
  @Permissions('charge:read')
  getPeriod(@Param('id') id: string) {
    return this.svc.getPeriod(id);
  }

  @Post('charge-periods/:id/approve')
  @Permissions('charge:approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.approvePeriod(id, userId);
  }

  @Get('units/:unitId/charges')
  @Permissions('charge:read')
  unitCharges(@Param('unitId') unitId: string) {
    return this.svc.unitCharges(unitId);
  }
}
