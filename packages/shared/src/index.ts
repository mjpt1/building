/**
 * قراردادهای مشترک — برای استفاده‌ی هم‌زمان در فرانت‌اند، بک‌اند و اپ موبایل آینده.
 * این بسته بدون وابستگی نگه داشته می‌شود تا در هر محیطی قابل استفاده باشد.
 */

export const ROLE_KEYS = [
  'SUPER_ADMIN', 'BUILDING_MANAGER', 'ACCOUNTANT', 'RESIDENT', 'OWNER', 'TECHNICIAN',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: 'مدیر کل',
  BUILDING_MANAGER: 'مدیر ساختمان',
  ACCOUNTANT: 'حسابدار',
  RESIDENT: 'ساکن',
  OWNER: 'مالک',
  TECHNICIAN: 'تکنسین تعمیرات',
};

export const CHARGE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'پرداخت‌نشده',
  PARTIAL: 'نیمه‌پرداخت',
  PAID: 'پرداخت‌شده',
  OVERDUE: 'معوق',
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'ثبت‌شده',
  REVIEWING: 'در انتظار بررسی',
  APPROVED: 'تاییدشده',
  IN_PROGRESS: 'در حال انجام',
  DONE: 'انجام‌شده',
  CANCELED: 'لغوشده',
};

/** قالب پاسخ استاندارد API */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number; [k: string]: unknown };
}
export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
