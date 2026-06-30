import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { ROLES } from '@/modules/rbac/rbac.constants';

/**
 * بررسی مجوزها و نقش‌ها. مدیر کل (SUPER_ADMIN) از همه‌ی بررسی‌ها عبور می‌کند.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPerms?.length && !requiredRoles?.length) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!user) throw new ForbiddenException('دسترسی غیرمجاز.');

    // مدیر کل دسترسی کامل دارد
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;

    if (requiredRoles?.length) {
      const ok = requiredRoles.some((r) => user.roles.includes(r));
      if (!ok) throw new ForbiddenException('این عملیات برای نقش شما مجاز نیست.');
    }

    if (requiredPerms?.length) {
      const ok = requiredPerms.every((p) => user.permissions.includes(p));
      if (!ok) {
        throw new ForbiddenException('شما مجوز لازم برای این عملیات را ندارید.');
      }
    }

    return true;
  }
}
