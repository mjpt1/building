/**
 * کاتالوگ نقش‌ها و مجوزها — منبع حقیقت RBAC.
 * این مقادیر در seed به دیتابیس نوشته می‌شوند و در گاردها استفاده می‌گردند.
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  BUILDING_MANAGER: 'BUILDING_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  RESIDENT: 'RESIDENT',
  OWNER: 'OWNER',
  TECHNICIAN: 'TECHNICIAN',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر کل',
  BUILDING_MANAGER: 'مدیر ساختمان',
  ACCOUNTANT: 'حسابدار',
  RESIDENT: 'ساکن',
  OWNER: 'مالک',
  TECHNICIAN: 'تکنسین تعمیرات',
};

/** هر مجوز: key و توضیح فارسی و گروه */
export interface PermissionDef {
  key: string;
  group: string;
  description: string;
}

const def = (key: string, group: string, description: string): PermissionDef => ({
  key,
  group,
  description,
});

export const PERMISSIONS: PermissionDef[] = [
  // مدیریت کاربران و نقش‌ها
  def('user:read', 'users', 'مشاهده کاربران'),
  def('user:create', 'users', 'ایجاد کاربر'),
  def('user:update', 'users', 'ویرایش کاربر'),
  def('user:delete', 'users', 'حذف کاربر'),
  def('role:read', 'rbac', 'مشاهده نقش‌ها و مجوزها'),
  def('role:assign', 'rbac', 'تخصیص نقش به کاربر'),
  // ساختمان و واحد
  def('building:read', 'building', 'مشاهده ساختمان‌ها'),
  def('building:create', 'building', 'ایجاد ساختمان'),
  def('building:update', 'building', 'ویرایش ساختمان'),
  def('building:delete', 'building', 'حذف ساختمان'),
  def('unit:read', 'building', 'مشاهده واحدها'),
  def('unit:create', 'building', 'ایجاد واحد'),
  def('unit:update', 'building', 'ویرایش واحد'),
  def('unit:delete', 'building', 'حذف واحد'),
  // اشخاص
  def('resident:read', 'people', 'مشاهده ساکنین'),
  def('resident:create', 'people', 'ثبت ساکن'),
  def('resident:update', 'people', 'ویرایش ساکن'),
  def('resident:delete', 'people', 'حذف ساکن'),
  def('owner:read', 'people', 'مشاهده مالکین'),
  def('owner:create', 'people', 'ثبت مالک'),
  def('owner:update', 'people', 'ویرایش مالک'),
  // شارژ
  def('charge:read', 'charge', 'مشاهده شارژ'),
  def('charge:create', 'charge', 'تعریف و محاسبه شارژ'),
  def('charge:update', 'charge', 'ویرایش شارژ'),
  def('charge:approve', 'charge', 'تایید نهایی دوره شارژ'),
  def('charge:delete', 'charge', 'حذف دوره شارژ'),
  // پرداخت
  def('payment:read', 'payment', 'مشاهده پرداخت‌ها'),
  def('payment:create', 'payment', 'ثبت پرداخت دستی'),
  def('payment:pay', 'payment', 'پرداخت آنلاین شارژ'),
  // حسابداری
  def('accounting:read', 'accounting', 'مشاهده حسابداری'),
  def('income:create', 'accounting', 'ثبت درآمد'),
  def('expense:create', 'accounting', 'ثبت هزینه'),
  def('accounting:update', 'accounting', 'ویرایش اسناد مالی'),
  def('accounting:delete', 'accounting', 'حذف اسناد مالی'),
  def('cashbox:manage', 'accounting', 'مدیریت صندوق‌ها'),
  // تعمیرات
  def('maintenance:read', 'maintenance', 'مشاهده درخواست‌های تعمیرات'),
  def('maintenance:create', 'maintenance', 'ثبت درخواست تعمیر'),
  def('maintenance:update', 'maintenance', 'به‌روزرسانی/تخصیص تعمیرات'),
  def('maintenance:delete', 'maintenance', 'حذف درخواست تعمیر'),
  // اطلاعیه‌ها
  def('announcement:read', 'announcement', 'مشاهده اطلاعیه‌ها'),
  def('announcement:create', 'announcement', 'ثبت اطلاعیه'),
  def('announcement:delete', 'announcement', 'حذف اطلاعیه'),
  // گزارش و تحلیل
  def('report:read', 'report', 'مشاهده گزارش‌ها'),
  def('analytics:query', 'report', 'پرسش تحلیل هوشمند'),
  // فایل‌ها
  def('file:upload', 'file', 'آپلود فایل'),
  def('file:read', 'file', 'مشاهده/دانلود فایل'),
  // لاگ
  def('audit:read', 'audit', 'مشاهده لاگ فعالیت‌ها'),
  // تنظیمات
  def('settings:read', 'settings', 'مشاهده تنظیمات'),
  def('settings:update', 'settings', 'ویرایش تنظیمات'),
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** نگاشت نقش → مجوزها */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // مدیر کل: همه‌ی مجوزها
  SUPER_ADMIN: ALL_PERMISSION_KEYS,

  // مدیر ساختمان: تقریباً همه به‌جز حذف ساختمان و مدیریت کاربران سراسری
  BUILDING_MANAGER: [
    'user:read',
    'role:read',
    'role:assign',
    'building:read',
    'building:update',
    'unit:read', 'unit:create', 'unit:update', 'unit:delete',
    'resident:read', 'resident:create', 'resident:update', 'resident:delete',
    'owner:read', 'owner:create', 'owner:update',
    'charge:read', 'charge:create', 'charge:update', 'charge:approve', 'charge:delete',
    'payment:read', 'payment:create',
    'accounting:read', 'income:create', 'expense:create', 'accounting:update', 'cashbox:manage',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete',
    'announcement:read', 'announcement:create', 'announcement:delete',
    'report:read', 'analytics:query',
    'file:upload', 'file:read',
    'audit:read',
    'settings:read', 'settings:update',
  ],

  // حسابدار: مالی + گزارش
  ACCOUNTANT: [
    'building:read', 'unit:read',
    'resident:read', 'owner:read',
    'charge:read', 'charge:create', 'charge:update',
    'payment:read', 'payment:create',
    'accounting:read', 'income:create', 'expense:create', 'accounting:update', 'cashbox:manage',
    'report:read', 'analytics:query',
    'file:upload', 'file:read',
  ],

  // ساکن: مشاهده شارژ/پرداخت خود، ثبت تعمیر، خواندن اطلاعیه
  RESIDENT: [
    'charge:read',
    'payment:read', 'payment:pay',
    'maintenance:read', 'maintenance:create',
    'announcement:read',
    'file:upload', 'file:read',
  ],

  // مالک: مشابه ساکن + مشاهده واحدها/مالی واحد خود
  OWNER: [
    'unit:read',
    'charge:read',
    'payment:read', 'payment:pay',
    'maintenance:read', 'maintenance:create',
    'announcement:read',
    'report:read',
    'file:read',
  ],

  // تکنسین: تعمیرات تخصیص‌یافته
  TECHNICIAN: [
    'maintenance:read', 'maintenance:update',
    'announcement:read',
    'file:upload', 'file:read',
  ],
};
