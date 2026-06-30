import jalaali from 'jalaali-js';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const FA_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/** نمایش تاریخ شمسی کوتاه از ورودی ISO یا شیٔ {iso,jalali} بک‌اند */
export function formatJalali(value: any): string {
  if (!value) return '—';
  if (typeof value === 'object' && value.jalali) return value.jalali;
  const iso = typeof value === 'object' ? value.iso : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toFaDigits(`${jy}/${pad2(jm)}/${pad2(jd)}`);
}

export function formatJalaliLong(value: any): string {
  if (!value) return '—';
  if (typeof value === 'object' && value.jalaliLong) return value.jalaliLong;
  const iso = typeof value === 'object' ? value.iso : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toFaDigits(`${jd} ${FA_MONTHS[jm - 1]} ${jy}`);
}

/** تاریخ امروز به‌صورت شمسی YYYY/MM/DD (برای مقدار پیش‌فرض فرم‌ها) */
export function todayJalali(): string {
  const d = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

export { FA_MONTHS };
