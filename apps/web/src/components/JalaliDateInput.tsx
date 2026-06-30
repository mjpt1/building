'use client';

import { toEnDigits, toFaDigits, todayJalali } from '@/lib/jalali';

/**
 * ورودی تاریخ شمسی ساده و قابل اتکا (YYYY/MM/DD).
 * مقدار به‌صورت رشته‌ی شمسی نگه‌داری می‌شود و همان‌طور به API ارسال می‌شود؛
 * بک‌اند آن را به تاریخ میلادی تبدیل می‌کند.
 */
export function JalaliDateInput({
  value,
  onChange,
  placeholder = '۱۴۰۳/۰۴/۰۹',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        className="input text-center"
        dir="ltr"
        value={toFaDigits(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(toEnDigits(e.target.value).replace(/[^0-9/]/g, ''))}
      />
      <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => onChange(todayJalali())}>
        امروز
      </button>
    </div>
  );
}
