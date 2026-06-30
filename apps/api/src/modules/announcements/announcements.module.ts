import { Module } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Post, Query, Injectable } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsNotEmpty } from 'class-validator';
import { AnnouncementAudience } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SmsService } from '@/integrations/sms/sms.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { toJalali } from '@/common/utils/jalali.util';

class CreateAnnouncementDto {
  @IsString() @IsNotEmpty({ message: 'عنوان الزامی است.' }) title!: string;
  @IsString() @IsNotEmpty({ message: 'متن اطلاعیه الزامی است.' }) body!: string;
  @IsOptional() @IsEnum(AnnouncementAudience) audience?: AnnouncementAudience;
  @IsOptional() @IsArray() targetUnits?: string[];
  @IsOptional() @IsBoolean() sendSms?: boolean;
  @IsOptional() @IsBoolean() isPinned?: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
  ) {}

  async create(buildingId: string, dto: CreateAnnouncementDto, userId: string) {
    const ann = await this.prisma.announcement.create({
      data: {
        buildingId,
        authorId: userId,
        title: dto.title,
        body: dto.body,
        audience: dto.audience ?? 'ALL',
        targetUnits: dto.targetUnits as any,
        sendSms: dto.sendSms ?? false,
        isPinned: dto.isPinned ?? false,
        publishedAt: new Date(),
      },
    });

    // مخاطبان: کاربرانِ ساکن/مالک این ساختمان
    const recipients = await this.resolveRecipients(buildingId, dto.audience ?? 'ALL', dto.targetUnits);
    await this.notifications.createMany(
      recipients.map((r) => r.userId).filter(Boolean) as string[],
      { type: 'ANNOUNCEMENT', title: dto.title, body: dto.body, data: { announcementId: ann.id } },
    );
    if (dto.sendSms) {
      for (const r of recipients) {
        if (r.mobile) await this.sms.send(r.mobile, `${dto.title}\n${dto.body}`).catch(() => null);
      }
    }
    return ann;
  }

  private async resolveRecipients(buildingId: string, audience: AnnouncementAudience, targetUnits?: string[]) {
    const result: { userId?: string | null; mobile?: string }[] = [];
    if (audience === 'ALL' || audience === 'RESIDENTS' || audience === 'CUSTOM') {
      const residents = await this.prisma.resident.findMany({
        where: {
          buildingId,
          deletedAt: null,
          isActive: true,
          ...(audience === 'CUSTOM' && targetUnits?.length
            ? { currentUnits: { some: { id: { in: targetUnits } } } }
            : {}),
        },
        select: { userId: true, mobile: true },
      });
      result.push(...residents);
    }
    if (audience === 'ALL' || audience === 'OWNERS') {
      const owners = await this.prisma.owner.findMany({
        where: { buildingId, deletedAt: null },
        select: { userId: true, mobile: true },
      });
      result.push(...owners);
    }
    return result;
  }

  async list(buildingId: string, q: PaginationQueryDto) {
    const where = { buildingId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: { author: { select: { fullName: true } }, _count: { select: { reads: true } } },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    const data = rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      isPinned: a.isPinned,
      author: a.author?.fullName,
      readsCount: a._count.reads,
      publishedAt: toJalali(a.publishedAt),
    }));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: {},
    });
    return { message: 'خوانده شد.' };
  }

  async remove(id: string) {
    await this.prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'اطلاعیه حذف شد.' };
  }
}

@ApiTags('announcements')
@ApiBearerAuth()
@Controller()
class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  @Post('buildings/:buildingId/announcements')
  @Permissions('announcement:create')
  create(@Param('buildingId') b: string, @Body() dto: CreateAnnouncementDto, @CurrentUser('id') uid: string) {
    return this.svc.create(b, dto, uid);
  }

  @Get('buildings/:buildingId/announcements')
  @Permissions('announcement:read')
  list(@Param('buildingId') b: string, @Query() q: PaginationQueryDto) {
    return this.svc.list(b, q);
  }

  @Post('announcements/:id/read')
  @Permissions('announcement:read')
  read(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.svc.markRead(id, uid);
  }

  @Delete('announcements/:id')
  @Permissions('announcement:delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
