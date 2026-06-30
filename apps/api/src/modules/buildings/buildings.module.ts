import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { UnitsController } from './units.controller';

@Module({
  controllers: [BuildingsController, UnitsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
