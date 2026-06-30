import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [AccountingModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
