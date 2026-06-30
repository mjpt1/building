import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface AuditInput {
  userId?: string | null;
  buildingId?: string | null;
  action: string; // CREATE | UPDATE | DELETE | LOGIN | PAYMENT | APPROVE ...
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ثبت یک رویداد در لاگ فعالیت‌ها (در صورت خطا، عملیات اصلی متوقف نمی‌شود) */
  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          buildingId: input.buildingId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          before: (input.before as any) ?? undefined,
          after: (input.after as any) ?? undefined,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
    } catch (e) {
      this.logger.warn(`ثبت لاگ ناموفق بود: ${(e as Error).message}`);
    }
  }
}
