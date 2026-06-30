import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
/** مجوزهای لازم برای دسترسی به endpoint (همه باید موجود باشند) */
export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);

export const ROLES_KEY = 'roles';
/** نقش‌های مجاز برای endpoint (وجود حداقل یکی کافی است) */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
