import { Module, Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AnalyticsService } from './analytics.service';
import { ChargesModule } from '@/modules/charges/charges.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { INTENTS } from './intents';

class AskDto {
  @IsString() @IsNotEmpty({ message: 'پرسش الزامی است.' }) question!: string;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('buildings/:buildingId/analytics')
class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Post('ask')
  @Permissions('analytics:query')
  ask(@Param('buildingId') b: string, @Body() dto: AskDto) {
    return this.svc.ask(b, dto.question);
  }

  /** نمونه‌پرسش‌های پیشنهادی برای UI */
  @Get('suggestions')
  @Permissions('analytics:query')
  suggestions() {
    return [
      'بدهکاران این ماه چه کسانی هستند؟',
      'موجودی صندوق الان چقدر است؟',
      'هزینه آسانسور در سال جاری چقدر بوده؟',
      'چه واحدهایی بیشترین تاخیر پرداخت را دارند؟',
      'خلاصه مالی ۳ ماه اخیر را بده',
      'برای شارژ ماه بعد چه عددی پیشنهاد می‌کنی؟',
      'وضعیت تعمیرات باز را خلاصه کن',
    ];
  }
}

@Module({
  imports: [ChargesModule, ReportsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
