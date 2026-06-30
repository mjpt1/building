import { ChargeMethod } from '@prisma/client';
import { roundRial } from '@/common/utils/money.util';

/** ورودی محاسبه برای هر واحد */
export interface UnitInput {
  unitId: string;
  code: string;
  area: number;
  residentsCount: number;
  coefficient: number;
}

/** خط ترکیب‌دهنده‌ی شارژ (از charge_items) */
export interface ChargeLine {
  title: string;
  method: ChargeMethod;
  amount: number; // مبلغ کل این خط برای کل ساختمان (ریال) — مگر FIXED که سرانه است
}

export interface CalcConfig {
  method: ChargeMethod; // روش کلی دوره
  baseAmount: number; // مبلغ ثابت پایه‌ی هر واحد (برای MIXED)
  items: ChargeLine[]; // خطوط
  formula?: { perArea?: number; perPerson?: number; fixed?: number; perCoefficient?: number };
}

export interface UnitCharge {
  unitId: string;
  code: string;
  amount: number;
  breakdown: { title: string; amount: number }[];
}

/**
 * موتور محاسبه‌ی شارژ.
 * منطق هر روش:
 *  - EQUAL: کل مبلغ خط، مساوی بین واحدها تقسیم می‌شود.
 *  - BY_AREA: کل مبلغ خط به نسبت متراژ هر واحد.
 *  - BY_PERSON: کل مبلغ خط به نسبت تعداد نفرات.
 *  - COEFFICIENT: کل مبلغ خط به نسبت ضریب واحد.
 *  - FIXED: مبلغ خط، سرانه‌ی هر واحد (به همه یکسان اضافه می‌شود).
 *  - MIXED: baseAmount ثابت هر واحد + جمع خطوط با روش هر خط.
 *  - CUSTOM_FORMULA: amount = fixed + perArea*area + perPerson*persons + perCoefficient*coef.
 */
export function calculateCharges(units: UnitInput[], config: CalcConfig): UnitCharge[] {
  if (units.length === 0) return [];

  const totalArea = sum(units.map((u) => u.area)) || 1;
  const totalPersons = sum(units.map((u) => u.residentsCount)) || 1;
  const totalCoef = sum(units.map((u) => u.coefficient)) || 1;
  const n = units.length;

  if (config.method === ChargeMethod.CUSTOM_FORMULA) {
    const f = config.formula ?? {};
    return units.map((u) => {
      const parts: { title: string; amount: number }[] = [];
      let amount = 0;
      if (f.fixed) {
        parts.push({ title: 'ثابت', amount: roundRial(f.fixed) });
        amount += f.fixed;
      }
      if (f.perArea) {
        const v = f.perArea * u.area;
        parts.push({ title: `متراژ (${u.area} م²)`, amount: roundRial(v) });
        amount += v;
      }
      if (f.perPerson) {
        const v = f.perPerson * u.residentsCount;
        parts.push({ title: `نفرات (${u.residentsCount})`, amount: roundRial(v) });
        amount += v;
      }
      if (f.perCoefficient) {
        const v = f.perCoefficient * u.coefficient;
        parts.push({ title: `ضریب (${u.coefficient})`, amount: roundRial(v) });
        amount += v;
      }
      return { unitId: u.unitId, code: u.code, amount: roundRial(amount), breakdown: parts };
    });
  }

  // برای روش‌های ساده، اگر items خالی بود، یک خط با baseAmount کل می‌سازیم
  const lines: ChargeLine[] =
    config.items.length > 0
      ? config.items
      : [{ title: 'شارژ', method: config.method, amount: config.baseAmount }];

  return units.map((u) => {
    const breakdown: { title: string; amount: number }[] = [];
    let amount = 0;

    // در روش ترکیبی، مبلغ پایه‌ی ثابت هر واحد
    if (config.method === ChargeMethod.MIXED && config.baseAmount > 0) {
      breakdown.push({ title: 'شارژ ثابت پایه', amount: roundRial(config.baseAmount) });
      amount += config.baseAmount;
    }

    for (const line of lines) {
      let share = 0;
      switch (line.method) {
        case ChargeMethod.EQUAL:
          share = line.amount / n;
          break;
        case ChargeMethod.BY_AREA:
          share = (line.amount * u.area) / totalArea;
          break;
        case ChargeMethod.BY_PERSON:
          share = (line.amount * u.residentsCount) / totalPersons;
          break;
        case ChargeMethod.COEFFICIENT:
          share = (line.amount * u.coefficient) / totalCoef;
          break;
        case ChargeMethod.FIXED:
          share = line.amount; // سرانه‌ی هر واحد
          break;
        default:
          share = line.amount / n;
      }
      share = roundRial(share);
      breakdown.push({ title: line.title, amount: share });
      amount += share;
    }

    return { unitId: u.unitId, code: u.code, amount: roundRial(amount), breakdown };
  });
}

/** محاسبه‌ی جریمه‌ی دیرکرد: تعداد روز گذشته از سررسید × نرخ روزانه */
export function calculatePenalty(dueDate: Date, penaltyPerDay: number, now = new Date()): number {
  if (penaltyPerDay <= 0) return 0;
  const diffMs = now.getTime() - dueDate.getTime();
  if (diffMs <= 0) return 0;
  const days = Math.floor(diffMs / 86_400_000);
  return roundRial(days * penaltyPerDay);
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}
