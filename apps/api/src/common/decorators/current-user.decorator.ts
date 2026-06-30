import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** کاربر احرازشده که توسط JwtStrategy روی request قرار گرفته است */
export interface AuthUser {
  id: string;
  mobile: string;
  fullName: string;
  roles: string[]; // کلید نقش‌ها: SUPER_ADMIN, BUILDING_MANAGER, ...
  permissions: string[]; // کلید مجوزها: charge:create, ...
  buildingIds: string[]; // ساختمان‌هایی که کاربر در آن‌ها نقش دارد
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
