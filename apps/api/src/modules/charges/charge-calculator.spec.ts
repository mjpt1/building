import { ChargeMethod } from '@prisma/client';
import { calculateCharges, calculatePenalty, UnitInput } from './charge-calculator';

const units: UnitInput[] = [
  { unitId: 'a', code: '1', area: 100, residentsCount: 2, coefficient: 1 },
  { unitId: 'b', code: '2', area: 100, residentsCount: 2, coefficient: 1 },
  { unitId: 'c', code: '3', area: 200, residentsCount: 4, coefficient: 2 },
];

describe('موتور محاسبه شارژ', () => {
  it('روش مساوی: مبلغ کل بین واحدها مساوی تقسیم می‌شود', () => {
    const r = calculateCharges(units, {
      method: ChargeMethod.EQUAL,
      baseAmount: 0,
      items: [{ title: 'شارژ', method: ChargeMethod.EQUAL, amount: 3_000_000 }],
    });
    expect(r.every((x) => x.amount === 1_000_000)).toBe(true);
  });

  it('روش متراژی: سهم به نسبت متراژ', () => {
    const r = calculateCharges(units, {
      method: ChargeMethod.BY_AREA,
      baseAmount: 0,
      items: [{ title: 'تاسیسات', method: ChargeMethod.BY_AREA, amount: 4_000_000 }],
    });
    // total area = 400 → 100/400*4m = 1m, 200/400*4m = 2m
    expect(r.find((x) => x.unitId === 'a')!.amount).toBe(1_000_000);
    expect(r.find((x) => x.unitId === 'c')!.amount).toBe(2_000_000);
  });

  it('روش نفری: سهم به نسبت تعداد نفرات', () => {
    const r = calculateCharges(units, {
      method: ChargeMethod.BY_PERSON,
      baseAmount: 0,
      items: [{ title: 'آسانسور', method: ChargeMethod.BY_PERSON, amount: 8_000_000 }],
    });
    // total persons = 8 → 2/8*8m = 2m, 4/8*8m = 4m
    expect(r.find((x) => x.unitId === 'a')!.amount).toBe(2_000_000);
    expect(r.find((x) => x.unitId === 'c')!.amount).toBe(4_000_000);
  });

  it('روش ترکیبی: مبلغ پایه‌ی ثابت + خطوط', () => {
    const r = calculateCharges(units, {
      method: ChargeMethod.MIXED,
      baseAmount: 500_000,
      items: [{ title: 'نظافت', method: ChargeMethod.EQUAL, amount: 3_000_000 }],
    });
    // هر واحد: 500k ثابت + 1m مساوی = 1.5m
    expect(r.every((x) => x.amount === 1_500_000)).toBe(true);
  });

  it('فرمول سفارشی: ترکیب خطی ثابت/متراژ/نفر', () => {
    const r = calculateCharges(units, {
      method: ChargeMethod.CUSTOM_FORMULA,
      baseAmount: 0,
      items: [],
      formula: { fixed: 200_000, perArea: 10_000, perPerson: 100_000 },
    });
    // واحد a: 200k + 100*10k + 2*100k = 200k + 1m + 200k = 1.4m
    expect(r.find((x) => x.unitId === 'a')!.amount).toBe(1_400_000);
  });

  it('جریمه دیرکرد: روزهای گذشته × نرخ روزانه', () => {
    const due = new Date(Date.now() - 5 * 86_400_000);
    expect(calculatePenalty(due, 50_000)).toBe(250_000);
    expect(calculatePenalty(new Date(Date.now() + 86_400_000), 50_000)).toBe(0);
  });
});
