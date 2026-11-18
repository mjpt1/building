import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES } from '@/modules/rbac/rbac.constants';

const SELF_SERVICE_ROLES: string[] = [ROLES.RESIDENT, ROLES.OWNER];

/** مسیرهای سطح ساختمان که ساکن/مالک نباید ببیند (داده‌ی سایر واحدها را برمی‌گردانند) */
const STAFF_ONLY_ROUTES = [
  /^\/buildings\/:buildingId\/(debtors|charges|reports)(\/|$)/,
  /^\/buildings\/:id\/units$/,
  /^\/charge-periods\/:id/,
  /^\/payments\/building\/:buildingId$/,
  /^\/dashboard\/manager\/:buildingId$/,
];

export const isSuperAdmin = (user: AuthUser) => user.roles.includes(ROLES.SUPER_ADMIN);

/** کاربر در این ساختمان فقط ساکن/مالک است و باید به داده‌ی خودش محدود شود */
export function isSelfService(user: AuthUser, buildingId: string): boolean {
  if (isSuperAdmin(user)) return false;
  const roles = user.buildingRoles?.[buildingId] ?? [];
  return roles.length > 0 && roles.every((r) => SELF_SERVICE_ROLES.includes(r));
}

interface Target {
  buildingId: string | null;
  unitId?: string | null;
  requesterId?: string | null;
}

/**
 * مرز دسترسی چندساختمانی: مجوز نقش باید «در همان ساختمانِ منبع» وجود داشته باشد
 * و ساکن/مالک فقط به واحد و درخواست‌های خودش برسد.
 */
@Injectable()
export class BuildingScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    // مسیرهای عمومی کاربر ندارند؛ مدیر کل محدودیت ساختمانی ندارد.
    if (!user || isSuperAdmin(user)) return true;

    const route = String(req.route?.path ?? '').replace(/^\/[^/]+\/v[^/]+(?=\/)/, '');
    const params = req.params ?? {};

    if (/^\/users\/:id/.test(route)) {
      const shared = await this.prisma.userRole.count({
        where: { userId: params.id, buildingId: { in: user.buildingIds } },
      });
      if (!shared) this.deny();
      return true;
    }

    const target = await this.resolveTarget(route, params, req.body);
    if (target === undefined) return true; // مسیر غیرساختمانی یا منبع ناموجود (۴۰۴ در سرویس)
    if (!target.buildingId) this.deny();
    const buildingId = target.buildingId as string;

    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const granted = user.buildingPermissions?.[buildingId] ?? [];
    if (!user.buildingIds.includes(buildingId) || !required.every((p) => granted.includes(p))) {
      this.deny();
    }

    if (isSelfService(user, buildingId)) {
      if (STAFF_ONLY_ROUTES.some((r) => r.test(route))) this.deny();
      if (target.unitId !== undefined || target.requesterId !== undefined) {
        const own = target.requesterId === user.id || (await this.ownsUnit(user.id, target.unitId));
        if (!own) this.deny();
      }
    }
    return true;
  }

  private deny(): never {
    throw new ForbiddenException('به این ساختمان یا رکورد دسترسی ندارید.');
  }

  private async ownsUnit(userId: string, unitId?: string | null) {
    if (!unitId) return false;
    const count = await this.prisma.unit.count({
      where: {
        id: unitId,
        OR: [{ currentResident: { userId } }, { owner: { userId } }],
      },
    });
    return count > 0;
  }

  private async resolveTarget(route: string, params: any, body: any): Promise<Target | undefined> {
    const id = params.id as string;
    const select = { buildingId: true } as const;
    const found = (row: { buildingId: string | null } | null) => row ?? undefined;

    if (params.buildingId) return { buildingId: params.buildingId };
    if (/^\/buildings\/:id/.test(route)) return { buildingId: id };

    if (/^\/units\/:(id|unitId)/.test(route)) {
      const unitId = (params.id ?? params.unitId) as string;
      const unit = await this.prisma.unit.findUnique({ where: { id: unitId }, select });
      return unit ? { buildingId: unit.buildingId, unitId } : undefined;
    }
    if (route === '/payments/online/initiate') {
      if (!body?.chargeId) return undefined;
      const charge = await this.prisma.charge.findUnique({
        where: { id: body.chargeId },
        select: { unitId: true, unit: { select } },
      });
      return charge ? { buildingId: charge.unit.buildingId, unitId: charge.unitId } : undefined;
    }
    if (/^\/payments\/:id/.test(route)) {
      const p = await this.prisma.payment.findUnique({
        where: { id },
        select: { buildingId: true, unitId: true },
      });
      return p ? { buildingId: p.buildingId, unitId: p.unitId } : undefined;
    }
    if (/^\/maintenance\/:id/.test(route)) {
      const m = await this.prisma.maintenanceRequest.findUnique({
        where: { id },
        select: { buildingId: true, unitId: true, requesterId: true },
      });
      return m ?? undefined;
    }
    if (/^\/charge-periods\/:id/.test(route)) {
      return found(await this.prisma.chargePeriod.findUnique({ where: { id }, select }));
    }
    if (/^\/residents\/:id/.test(route)) {
      return found(await this.prisma.resident.findUnique({ where: { id }, select }));
    }
    if (/^\/owners\/:id/.test(route)) {
      return found(await this.prisma.owner.findUnique({ where: { id }, select }));
    }
    if (/^\/announcements\/:id/.test(route)) {
      return found(await this.prisma.announcement.findUnique({ where: { id }, select }));
    }
    if (/^\/files\/:id/.test(route)) {
      return found(await this.prisma.attachment.findUnique({ where: { id }, select }));
    }
    return undefined;
  }
}
