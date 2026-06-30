import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ROLE_LABELS } from './rbac.constants';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      label: ROLE_LABELS[r.key] ?? r.name,
      description: r.description,
      isSystem: r.isSystem,
      usersCount: r._count.userRoles,
      permissions: r.rolePermissions.map((rp) => rp.permission.key),
    }));
  }

  async listPermissions() {
    const perms = await this.prisma.permission.findMany({ orderBy: { group: 'asc' } });
    const grouped: Record<string, { key: string; description: string }[]> = {};
    for (const p of perms) {
      (grouped[p.group] ??= []).push({ key: p.key, description: p.description });
    }
    return grouped;
  }

  async assignRole(userId: string, roleKey: string, buildingId?: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { key: roleKey } }),
    ]);
    if (!user) throw new NotFoundException('کاربر یافت نشد.');
    if (!role) throw new NotFoundException('نقش یافت نشد.');

    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId_buildingId: {
          userId,
          roleId: role.id,
          buildingId: buildingId ?? null as any,
        },
      },
    }).catch(() => null);
    if (existing) throw new BadRequestException('این نقش قبلاً به کاربر اختصاص یافته است.');

    return this.prisma.userRole.create({
      data: { userId, roleId: role.id, buildingId: buildingId ?? null },
    });
  }

  async revokeRole(userRoleId: string) {
    await this.prisma.userRole.delete({ where: { id: userRoleId } });
    return { message: 'نقش حذف شد.' };
  }

  async updateRolePermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('نقش یافت نشد.');
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);
    return { message: 'مجوزهای نقش به‌روزرسانی شد.', count: perms.length };
  }
}
