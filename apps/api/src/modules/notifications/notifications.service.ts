import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { toJalali } from '@/common/utils/jalali.util';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType | keyof typeof NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as NotificationType,
        title: input.title,
        body: input.body,
        data: (input.data as any) ?? undefined,
      },
    });
  }

  /** ارسال انبوه به چند کاربر */
  async createMany(userIds: string[], payload: Omit<CreateNotificationInput, 'userId'>) {
    if (userIds.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type as NotificationType,
        title: payload.title,
        body: payload.body,
        data: (payload.data as any) ?? undefined,
      })),
    });
  }

  async list(userId: string, q: PaginationQueryDto) {
    const where = { userId };
    const [rows, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    const data = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      isRead: n.isRead,
      createdAt: toJalali(n.createdAt),
    }));
    return { data, meta: { ...buildMeta(total, q.page, q.limit), unread } };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'خوانده شد.' };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'همه‌ی اعلان‌ها خوانده شد.' };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }
}
