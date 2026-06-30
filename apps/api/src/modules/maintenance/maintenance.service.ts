import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { toJalali } from '@/common/utils/jalali.util';
import { generateTrackingNo } from '@/common/utils/crypto.util';
import {
  CreateMaintenanceDto,
  UpdateStatusDto,
  AssignDto,
  AddCommentDto,
} from './dto/maintenance.dto';

/** گذارهای مجاز وضعیت تعمیرات */
const TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  SUBMITTED: ['REVIEWING', 'APPROVED', 'CANCELED'],
  REVIEWING: ['APPROVED', 'CANCELED'],
  APPROVED: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['DONE', 'CANCELED'],
  DONE: [],
  CANCELED: [],
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'ثبت‌شده',
  REVIEWING: 'در انتظار بررسی',
  APPROVED: 'تاییدشده',
  IN_PROGRESS: 'در حال انجام',
  DONE: 'انجام‌شده',
  CANCELED: 'لغوشده',
};

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(buildingId: string, dto: CreateMaintenanceDto, userId: string) {
    const req = await this.prisma.maintenanceRequest.create({
      data: {
        buildingId,
        unitId: dto.unitId,
        residentId: dto.residentId,
        requesterId: userId,
        trackingNo: generateTrackingNo('TKT'),
        title: dto.title,
        description: dto.description,
        category: dto.category,
        location: dto.location,
        priority: dto.priority ?? 'NORMAL',
        attachments: dto.attachmentIds?.length
          ? { create: dto.attachmentIds.map((attachmentId) => ({ attachmentId })) }
          : undefined,
      },
    });
    await this.audit.log({ userId, buildingId, action: 'CREATE', entity: 'Maintenance', entityId: req.id });
    return req;
  }

  async list(buildingId: string, q: PaginationQueryDto & { status?: string; priority?: string; assignedToId?: string }) {
    const where: any = { buildingId, deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.assignedToId) where.assignedToId = q.assignedToId;
    if (q.search) where.OR = [{ title: { contains: q.search } }, { trackingNo: { contains: q.search } }];

    const [rows, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where,
        include: {
          unit: { select: { code: true } },
          assignedTo: { select: { fullName: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      trackingNo: r.trackingNo,
      title: r.title,
      unitCode: r.unit?.code,
      category: r.category,
      priority: r.priority,
      status: r.status,
      statusLabel: STATUS_LABEL[r.status],
      assignedTo: r.assignedTo?.fullName,
      createdAt: toJalali(r.createdAt),
    }));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }

  async getOne(id: string) {
    const r = await this.prisma.maintenanceRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        unit: { select: { code: true } },
        requester: { select: { fullName: true } },
        resident: { select: { fullName: true, mobile: true } },
        assignedTo: { select: { id: true, fullName: true, mobile: true } },
        comments: { include: { author: { select: { fullName: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: { include: { attachment: true } },
      },
    });
    if (!r) throw new NotFoundException('درخواست یافت نشد.');
    return {
      ...r,
      statusLabel: STATUS_LABEL[r.status],
      cost: r.cost ? Number(r.cost) : null,
      createdAt: toJalali(r.createdAt),
      resolvedAt: toJalali(r.resolvedAt),
      comments: r.comments.map((c) => ({
        id: c.id,
        author: c.author?.fullName ?? 'سیستم',
        body: c.body,
        statusFrom: c.statusFrom,
        statusTo: c.statusTo,
        createdAt: toJalali(c.createdAt),
      })),
    };
  }

  async changeStatus(id: string, dto: UpdateStatusDto, userId: string) {
    const req = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('درخواست یافت نشد.');
    const allowed = TRANSITIONS[req.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `تغییر وضعیت از «${STATUS_LABEL[req.status]}» به «${STATUS_LABEL[dto.status]}» مجاز نیست.`,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: dto.status,
          cost: dto.cost ?? req.cost,
          resolvedAt: dto.status === 'DONE' ? new Date() : req.resolvedAt,
        },
      });
      await tx.maintenanceComment.create({
        data: {
          requestId: id,
          authorId: userId,
          body: dto.comment ?? `وضعیت به «${STATUS_LABEL[dto.status]}» تغییر کرد.`,
          statusFrom: req.status,
          statusTo: dto.status,
        },
      });
      return u;
    });

    // اعلان به ثبت‌کننده
    if (req.requesterId) {
      await this.notifications.create({
        userId: req.requesterId,
        type: 'MAINTENANCE',
        title: `به‌روزرسانی درخواست ${req.trackingNo}`,
        body: `وضعیت درخواست شما: ${STATUS_LABEL[dto.status]}`,
        data: { requestId: id },
      });
    }
    await this.audit.log({ userId, buildingId: req.buildingId, action: 'UPDATE_STATUS', entity: 'Maintenance', entityId: id, after: { status: dto.status } });
    return updated;
  }

  async assign(id: string, dto: AssignDto, userId: string) {
    const req = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('درخواست یافت نشد.');
    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id },
        data: { assignedToId: dto.assignedToId, status: req.status === 'SUBMITTED' ? 'APPROVED' : req.status },
      });
      await tx.maintenanceComment.create({
        data: { requestId: id, authorId: userId, body: dto.comment ?? 'درخواست به تکنسین تخصیص یافت.' },
      });
    });
    await this.notifications.create({
      userId: dto.assignedToId,
      type: 'MAINTENANCE',
      title: 'درخواست تعمیر جدید به شما تخصیص یافت',
      body: req.title,
      data: { requestId: id },
    });
    return { message: 'تخصیص انجام شد.' };
  }

  async addComment(id: string, dto: AddCommentDto, userId: string) {
    const req = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('درخواست یافت نشد.');
    return this.prisma.maintenanceComment.create({
      data: { requestId: id, authorId: userId, body: dto.body },
    });
  }
}
