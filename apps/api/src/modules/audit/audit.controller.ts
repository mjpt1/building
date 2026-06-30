import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { toJalali } from '@/common/utils/jalali.util';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('audit:read')
  async list(@Query() q: PaginationQueryDto & { entity?: string; userId?: string }) {
    const where: any = {};
    if (q.entity) where.entity = q.entity;
    if (q.userId) where.userId = q.userId;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, mobile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      user: r.user ? r.user.fullName : 'سیستم',
      ip: r.ip,
      createdAt: toJalali(r.createdAt),
    }));

    return { data, meta: buildMeta(total, q.page, q.limit) };
  }
}
