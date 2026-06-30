/**
 * ابزار تاریخ جلالی (شمسی).
 * قاعده: ذخیره و منطق داخلی همیشه با Date استاندارد (UTC). تبدیل به جلالی
 * فقط هنگام نمایش/خروجی API و تبدیل از جلالی فقط هنگام دریافت ورودی انجام می‌شود.
 */
import jalaali from 'jalaali-js';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const FA_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
const FA_WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** خروجی استاندارد یک تاریخ برای API: هم ISO هم رشته‌ی شمسی آماده‌ی نمایش */
export interface JalaliDateOutput {
  iso: string;
  jalali: string; // ۱۴۰۳/۰۴/۰۹
  jalaliLong: string; // ۹ تیر ۱۴۰۳
}

export function toJalali(date: Date | string | null | undefined): JalaliDateOutput | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const { jy, jm, jd } = jalaali.toJalaali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  const short = `${jy}/${pad2(jm)}/${pad2(jd)}`;
  const long = `${jd} ${FA_MONTHS[jm - 1]} ${jy}`;
  return {
    iso: d.toISOString(),
    jalali: toFaDigits(short),
    jalaliLong: toFaDigits(long),
  };
}

/** فقط رشته‌ی کوتاه شمسی فارسی (برای جدول‌ها/گزارش‌ها) */
export function formatJalali(date: Date | string | null | undefined): string {
  const out = toJalali(date);
  return out ? out.jalali : '—';
}

/**
 * تبدیل ورودی کاربر به Date.
 * ورودی می‌تواند ISO استاندارد یا شمسی به شکل YYYY/MM/DD (با ارقام فا/لاتین) باشد.
 */
export function parseJalaliInput(input: string): Date {
  const normalized = toEnDigits(input.trim());
  // اگر ISO بود
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return new Date(normalized);
  }
  const m = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) {
    throw new Error('فرمت تاریخ نامعتبر است. نمونه صحیح: ۱۴۰۳/۰۴/۰۹');
  }
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) {
    throw new Error('تاریخ شمسی نامعتبر است.');
  }
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  // ساعت ۱۲ ظهر UTC تا تغییر منطقه زمانی روزِ شمسی را جابه‌جا نکند
  return new Date(Date.UTC(gy, gm - 1, gd, 8, 30, 0));
}

/** سال و ماه جلالیِ یک تاریخ (برای دوره‌ی شارژ) */
export function jalaliYearMonth(date: Date): { year: number; month: number } {
  const { jy, jm } = jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return { year: jy, month: jm };
}

/** اولین و آخرین روزِ یک ماهِ جلالی به‌صورت بازه‌ی Date میلادی */
export function jalaliMonthRange(jy: number, jm: number): { start: Date; end: Date } {
  const startG = jalaali.toGregorian(jy, jm, 1);
  const daysInMonth = jalaali.jalaaliMonthLength(jy, jm);
  const endG = jalaali.toGregorian(jy, jm, daysInMonth);
  return {
    start: new Date(Date.UTC(startG.gy, startG.gm - 1, startG.gd, 0, 0, 0)),
    end: new Date(Date.UTC(endG.gy, endG.gm - 1, endG.gd, 23, 59, 59)),
  };
}

/** نام ماه جلالی */
export function jalaliMonthName(month: number): string {
  return FA_MONTHS[month - 1] ?? '';
}

/** عنوان دوره مثل «شارژ تیر ۱۴۰۳» */
export function jalaliPeriodTitle(year: number, month: number): string {
  return `${jalaliMonthName(month)} ${toFaDigits(year)}`;
}

export { FA_MONTHS, FA_WEEKDAYS };
