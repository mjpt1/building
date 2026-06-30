import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { UpdateUnitDto } from './dto/building.dto';

@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly svc: BuildingsService) {}

  @Get(':id')
  @Permissions('unit:read')
  get(@Param('id') id: string) {
    return this.svc.getUnit(id);
  }

  @Put(':id')
  @Permissions('unit:update')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.svc.updateUnit(id, dto);
  }

  @Delete(':id')
  @Permissions('unit:delete')
  remove(@Param('id') id: string) {
    return this.svc.removeUnit(id);
  }
}
