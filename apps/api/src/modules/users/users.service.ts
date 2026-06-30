import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { hashSecret } from '@/common/utils/crypto.util';
import { toJalali } from '@/common/utils/jalali.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationQueryDto) {
    const where: any = { deletedAt: null };
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { mobile: { contains: q.search } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        orderBy: { [q.sortBy ?? 'createdAt']: q.sortOrder },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    const data = rows.map((u) => this.serialize(u));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { userRoles: { include: { role: true, building: true } } },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد.');
    return this.serialize(user);
  }

  async getProfile(id: string) {
    return this.findOne(id);
  }

  async updateProfile(id: string, data: { fullName?: string; email?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.serialize(user);
  }

  async create(data: {
    mobile: string;
    fullName: string;
    password: string;
    email?: string;
    nationalId?: string;
  }) {
    const passwordHash = await hashSecret(data.password);
    const user = await this.prisma.user.create({
      data: {
        mobile: data.mobile,
        fullName: data.fullName,
        email: data.email,
        nationalId: data.nationalId,
        passwordHash,
      },
    });
    return this.serialize(user);
  }

  async setActive(id: string, isActive: boolean) {
    await this.prisma.user.update({ where: { id }, data: { isActive } });
    return { message: isActive ? 'کاربر فعال شد.' : 'کاربر غیرفعال شد.' };
  }

  async softDelete(id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'کاربر حذف شد.' };
  }

  private serialize(u: any) {
    return {
      id: u.id,
      mobile: u.mobile,
      fullName: u.fullName,
      email: u.email,
      nationalId: u.nationalId,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      roles: (u.userRoles ?? []).map((ur: any) => ({
        id: ur.id,
        key: ur.role.key,
        name: ur.role.name,
        buildingId: ur.buildingId,
        building: ur.building?.name,
      })),
      lastLoginAt: toJalali(u.lastLoginAt),
      createdAt: toJalali(u.createdAt),
    };
  }
}
