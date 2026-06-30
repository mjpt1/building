import { formatRial } from '@/common/utils/money.util';
import { formatJalali } from '@/common/utils/jalali.util';

/**
 * تولید رسید پرداخت به‌صورت HTML قابل چاپ/تبدیل به PDF (راست‌چین و فارسی).
 * این روش برخلاف تولید مستقیم PDF، شکل‌دهی صحیح حروف فارسی را تضمین می‌کند.
 */
export function buildReceiptHtml(p: any): string {
  const rows: [string, string][] = [
    ['شماره رسید', p.receiptNo ?? '—'],
    ['ساختمان', p.building?.name ?? '—'],
    ['واحد', p.unit?.code ?? '—'],
    ['پرداخت‌کننده', p.resident?.fullName ?? '—'],
    ['بابت', p.charge?.period?.title ?? 'پرداخت'],
    ['روش پرداخت', methodLabel(p.method)],
    ['مبلغ', formatRial(Number(p.amount))],
    ['تاریخ پرداخت', formatJalali(p.paidAt)],
    ['کد رهگیری', p.transaction?.refId ?? '—'],
  ];
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td class="k">${k}</td><td class="v">${escapeHtml(String(v))}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>رسید پرداخت ${escapeHtml(p.receiptNo ?? '')}</title>
<style>
  @font-face { font-family: Vazirmatn; src: local('Vazirmatn'); }
  * { box-sizing: border-box; font-family: Vazirmatn, Tahoma, sans-serif; }
  body { background:#f3f4f6; margin:0; padding:24px; color:#1f2937; }
  .card { max-width:480px; margin:auto; background:#fff; border-radius:16px; padding:28px; box-shadow:0 4px 16px rgba(0,0,0,.08); }
  .head { text-align:center; border-bottom:2px dashed #e5e7eb; padding-bottom:16px; margin-bottom:16px; }
  .head h1 { font-size:18px; margin:0 0 4px; color:#1e3a8a; }
  .badge { display:inline-block; background:#dcfce7; color:#166534; padding:4px 12px; border-radius:999px; font-size:13px; margin-top:8px; }
  table { width:100%; border-collapse:collapse; }
  td { padding:10px 4px; border-bottom:1px solid #f1f5f9; font-size:14px; }
  td.k { color:#6b7280; width:42%; }
  td.v { font-weight:600; }
  .foot { text-align:center; margin-top:18px; color:#9ca3af; font-size:12px; }
  @media print { body { background:#fff; padding:0; } .card { box-shadow:none; } }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <h1>رسید پرداخت شارژ</h1>
      <div>سامانه مدیریت ساختمان</div>
      <span class="badge">پرداخت موفق</span>
    </div>
    <table>${tr}</table>
    <div class="foot">این رسید به‌صورت الکترونیکی صادر شده و معتبر است.</div>
  </div>
  <script>window.onload = () => { if (location.search.includes('print')) window.print(); };</script>
</body>
</html>`;
}

function methodLabel(m: string): string {
  return ({ CASH: 'نقدی', CARD: 'کارت‌خوان', TRANSFER: 'واریز', ONLINE: 'آنلاین' } as any)[m] ?? m;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
