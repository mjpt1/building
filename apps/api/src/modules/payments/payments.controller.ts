import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  Redirect,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { CreatePaymentDto, InitiateOnlineDto } from './dto/payment.dto';
import { buildReceiptHtml } from './receipt.util';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @ApiBearerAuth()
  @Post('manual/:buildingId')
  @Permissions('payment:create')
  manual(
    @Param('buildingId') b: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') uid: string,
  ) {
    return this.svc.recordManual(b, dto, uid);
  }

  @ApiBearerAuth()
  @Post('online/initiate')
  @Permissions('payment:pay')
  initiate(@Body() dto: InitiateOnlineDto, @CurrentUser('id') uid: string) {
    return this.svc.initiateOnline(dto, uid);
  }

  /** بازگشت درگاه — عمومی. پس از تایید به فرانت‌اند هدایت می‌شود. */
  @Public()
  @Get('verify')
  @Redirect()
  async verify(@Query('Authority') authority: string, @Query('Status') status: string) {
    const result = await this.svc.verifyOnline(authority, status);
    const webBase = this.config.get<string>('corsOrigin')?.split(',')[0] ?? 'http://localhost:3000';
    const query = new URLSearchParams({
      success: String(result.success),
      message: result.message,
      ...(result.refId ? { refId: result.refId } : {}),
      ...(result.receiptNo ? { receiptNo: result.receiptNo } : {}),
    }).toString();
    return { url: `${webBase}/payment/result?${query}` };
  }

  @ApiBearerAuth()
  @Get('building/:buildingId')
  @Permissions('payment:read')
  list(
    @Param('buildingId') b: string,
    @Query() q: PaginationQueryDto & { unitId?: string; method?: string },
  ) {
    return this.svc.list(b, q);
  }

  @ApiBearerAuth()
  @Get(':id')
  @Permissions('payment:read')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  /** رسید قابل چاپ (HTML راست‌چین) */
  @Public()
  @Get(':id/receipt')
  async receipt(@Param('id') id: string, @Res() res: Response) {
    const payment = await this.svc.getOne(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildReceiptHtml(payment));
  }
}
