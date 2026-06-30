import { toJalali, parseJalaliInput, toFaDigits, toEnDigits, jalaliYearMonth } from './jalali.util';

describe('ابزار تاریخ جلالی', () => {
  it('تبدیل میلادی به شمسی درست است', () => {
    const out = toJalali(new Date('2024-06-29T08:30:00Z'));
    expect(out?.jalali).toContain('۱۴۰۳');
  });

  it('ارقام فارسی/لاتین', () => {
    expect(toFaDigits('1403')).toBe('۱۴۰۳');
    expect(toEnDigits('۱۴۰۳')).toBe('1403');
  });

  it('پارس ورودی شمسی به Date معتبر', () => {
    const d = parseJalaliInput('۱۴۰۳/۰۴/۰۹');
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('ورودی نامعتبر خطا می‌دهد', () => {
    expect(() => parseJalaliInput('سلام')).toThrow();
  });

  it('سال و ماه جلالی', () => {
    const { year } = jalaliYearMonth(new Date('2024-06-29T08:30:00Z'));
    expect(year).toBe(1403);
  });
});
