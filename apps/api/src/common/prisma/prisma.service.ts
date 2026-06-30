import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('اتصال به دیتابیس برقرار شد.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** کمک‌تابع: شرط حذف‌نرم برای موجودیت‌هایی که deletedAt دارند */
  get notDeleted() {
    return { deletedAt: null };
  }
}
