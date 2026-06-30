import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateFloorDto,
} from './dto/building.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly svc: BuildingsService) {}

  @Get()
  @Permissions('building:read')
  list(@Query() q: PaginationQueryDto) {
    return this.svc.listBuildings(q);
  }

  @Get(':id')
  @Permissions('building:read')
  get(@Param('id') id: string) {
    return this.svc.getBuilding(id);
  }

  @Post()
  @Permissions('building:create')
  create(@Body() dto: CreateBuildingDto) {
    return this.svc.createBuilding(dto);
  }

  @Put(':id')
  @Permissions('building:update')
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.svc.updateBuilding(id, dto);
  }

  @Delete(':id')
  @Permissions('building:delete')
  remove(@Param('id') id: string) {
    return this.svc.removeBuilding(id);
  }

  // طبقات
  @Get(':id/floors')
  @Permissions('building:read')
  floors(@Param('id') id: string) {
    return this.svc.listFloors(id);
  }

  @Post(':id/floors')
  @Permissions('unit:create')
  createFloor(@Param('id') id: string, @Body() dto: CreateFloorDto) {
    return this.svc.createFloor(id, dto);
  }

  // واحدها
  @Get(':id/units')
  @Permissions('unit:read')
  units(@Param('id') id: string, @Query() q: PaginationQueryDto) {
    return this.svc.listUnits(id, q);
  }

  @Post(':id/units')
  @Permissions('unit:create')
  createUnit(@Param('id') id: string, @Body() dto: CreateUnitDto) {
    return this.svc.createUnit(id, dto);
  }
}
