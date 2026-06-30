/**
 * تعریف نیّت‌ها (intents) برای موتور تحلیل هوشمند.
 * هر intent با مجموعه‌ای از کلیدواژه‌ها تشخیص داده می‌شود.
 */
export type IntentKey =
  | 'DEBTORS'
  | 'CASHBOX_BALANCE'
  | 'EXPENSE_BY_KEYWORD'
  | 'FINANCE_SUMMARY'
  | 'TOP_LATE_PAYERS'
  | 'SUGGEST_CHARGE'
  | 'OPEN_MAINTENANCE'
  | 'INCOME_THIS_MONTH'
  | 'EXPENSE_THIS_MONTH';

export interface IntentDef {
  key: IntentKey;
  keywords: string[][]; // هر زیرآرایه یک «و» منطقی است؛ کل آرایه «یا»
  description: string;
}

export const INTENTS: IntentDef[] = [
  {
    key: 'DEBTORS',
    keywords: [['بدهکار'], ['بدهی', 'واحد'], ['چه کسانی', 'بدهکار']],
    description: 'فهرست بدهکاران',
  },
  {
    key: 'CASHBOX_BALANCE',
    keywords: [['موجودی', 'صندوق'], ['مانده', 'صندوق'], ['صندوق', 'چقدر']],
    description: 'موجودی صندوق',
  },
  {
    key: 'TOP_LATE_PAYERS',
    keywords: [['بیشترین', 'تاخیر'], ['دیرکرد'], ['تاخیر', 'پرداخت']],
    description: 'واحدهای با بیشترین تاخیر',
  },
  {
    key: 'SUGGEST_CHARGE',
    keywords: [['پیشنهاد', 'شارژ'], ['شارژ', 'ماه بعد'], ['چه عددی', 'شارژ']],
    description: 'پیشنهاد مبلغ شارژ',
  },
  {
    key: 'OPEN_MAINTENANCE',
    keywords: [['تعمیرات', 'باز'], ['تعمیرات', 'وضعیت'], ['درخواست', 'تعمیر']],
    description: 'وضعیت تعمیرات باز',
  },
  {
    key: 'FINANCE_SUMMARY',
    keywords: [['خلاصه', 'مالی'], ['وضعیت', 'مالی'], ['گزارش', 'ماه']],
    description: 'خلاصه مالی چند ماه اخیر',
  },
  {
    key: 'INCOME_THIS_MONTH',
    keywords: [['درآمد', 'ماه'], ['درآمد', 'این ماه']],
    description: 'درآمد این ماه',
  },
  {
    key: 'EXPENSE_BY_KEYWORD',
    keywords: [['هزینه', 'آسانسور'], ['هزینه', 'نظافت'], ['هزینه', 'سال']],
    description: 'هزینه یک دسته‌ی خاص',
  },
  {
    key: 'EXPENSE_THIS_MONTH',
    keywords: [['هزینه', 'ماه'], ['هزینه', 'این ماه']],
    description: 'هزینه این ماه',
  },
];

/** نرمال‌سازی متن فارسی: یکسان‌سازی ی/ک و حذف اعراب */
export function normalizeFa(text: string): string {
  return text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ً-ْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تشخیص intent از متن پرسش؛ امتیازدهی ساده بر اساس تطبیق کلیدواژه */
export function detectIntent(question: string): IntentKey | null {
  const q = normalizeFa(question);
  let best: { key: IntentKey; score: number } | null = null;
  for (const intent of INTENTS) {
    for (const group of intent.keywords) {
      if (group.every((kw) => q.includes(normalizeFa(kw)))) {
        const score = group.join('').length;
        if (!best || score > best.score) best = { key: intent.key, score };
      }
    }
  }
  return best?.key ?? null;
}
