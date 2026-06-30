/**
 * ابزار پول — تمام مبالغ در سیستم «ریال» و به‌صورت عدد صحیح هستند.
 * نمایش به کاربر می‌تواند با جداکننده‌ی هزارگان و ارقام فارسی باشد.
 */
import { toFaDigits } from './jalali.util';

/** افزودن جداکننده‌ی هزارگان: 1500000 → 1,500,000 */
export function groupThousands(value: number | string): string {
  const n = typeof value === 'string' ? value : Math.round(value).toString();
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** نمایش ریالی فارسی: 1500000 → «۱٬۵۰۰٬۰۰۰ ریال» */
export function formatRial(value: number | bigint): string {
  const grouped = groupThousands(Number(value)).replace(/,/g, '٬');
  return `${toFaDigits(grouped)} ریال`;
}

/** نمایش تومانی فارسی (هر تومان = ۱۰ ریال) */
export function formatToman(rial: number | bigint): string {
  const toman = Math.round(Number(rial) / 10);
  const grouped = groupThousands(toman).replace(/,/g, '٬');
  return `${toFaDigits(grouped)} تومان`;
}

/** گردکردن امن به نزدیک‌ترین ریال */
export function roundRial(value: number): number {
  return Math.round(value);
}
