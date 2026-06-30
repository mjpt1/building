import { toFaDigits } from './jalali';

/** افزودن جداکننده‌ی هزارگان */
export function groupThousands(value: number | string): string {
  const n = typeof value === 'string' ? value : Math.round(value).toString();
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}

/** نمایش ریالی فارسی */
export function formatRial(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${toFaDigits(groupThousands(value))} ریال`;
}

/** نمایش تومانی فارسی */
export function formatToman(rial: number | null | undefined): string {
  if (rial === null || rial === undefined) return '—';
  return `${toFaDigits(groupThousands(Math.round(rial / 10)))} تومان`;
}

/** عدد فارسی ساده */
export function faNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return toFaDigits(groupThousands(value));
}
