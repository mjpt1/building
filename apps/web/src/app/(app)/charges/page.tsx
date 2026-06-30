'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial, faNumber } from '@/lib/format';
import { todayJalali } from '@/lib/jalali';
import { JalaliDateInput } from '@/components/JalaliDateInput';
import { PageHeader, Loading, EmptyState, StatusBadge, Modal } from '@/components/ui';

export default function ChargesPage() {
  const { buildingId } = useAuth();
  const [tab, setTab] = useState<'periods' | 'debtors'>('periods');
  const [showCreate, setShowCreate] = useState(false);

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  return (
    <div>
      <PageHeader
        title="شارژ و بدهی"
        subtitle="تعریف دوره‌ی شارژ، محاسبه و مدیریت بدهکاران"
        action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> دوره‌ی جدید</button>}
      />

      <div className="mb-4 flex gap-2">
        <TabBtn active={tab === 'periods'} onClick={() => setTab('periods')}>دوره‌های شارژ</TabBtn>
        <TabBtn active={tab === 'debtors'} onClick={() => setTab('debtors')}>بدهکاران</TabBtn>
      </div>

      {tab === 'periods' ? <Periods buildingId={buildingId} /> : <Debtors buildingId={buildingId} />}

      {showCreate && <CreatePeriodModal buildingId={buildingId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
      {children}
    </button>
  );
}

function Periods({ buildingId }: { buildingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['charge-periods', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/charges`, { limit: 50 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="هیچ دوره‌ی شارژی ثبت نشده است." />;

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead><tr>
          <th className="th">عنوان</th><th className="th">روش</th><th className="th">جمع کل</th>
          <th className="th">سررسید</th><th className="th">واحدها</th><th className="th">وضعیت</th><th className="th"></th>
        </tr></thead>
        <tbody>
          {data.map((p: any) => (
            <tr key={p.id}>
              <td className="td font-medium">{p.title}</td>
              <td className="td">{methodLabel(p.method)}</td>
              <td className="td">{formatRial(p.totalAmount)}</td>
              <td className="td text-gray-500">{p.dueDate?.jalali}</td>
              <td className="td">{faNumber(p.unitsCount)}</td>
              <td className="td"><StatusBadge status={p.status} /></td>
              <td className="td"><Link href={`/charges/${p.id}`} className="text-brand-600 hover:underline">مشاهده</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Debtors({ buildingId }: { buildingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['debtors', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/debtors`)).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="هیچ واحد بدهکاری وجود ندارد. ✅" />;

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead><tr>
          <th className="th">واحد</th><th className="th">نام</th><th className="th">موبایل</th>
          <th className="th">دوره‌های معوق</th><th className="th">مجموع بدهی</th>
        </tr></thead>
        <tbody>
          {data.map((d: any, i: number) => (
            <tr key={i}>
              <td className="td font-medium">واحد {d.unitCode}</td>
              <td className="td">{d.name}</td>
              <td className="td text-gray-500" dir="ltr">{d.mobile}</td>
              <td className="td">{faNumber(d.periods)}</td>
              <td className="td font-bold text-danger">{formatRial(d.totalDebt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreatePeriodModal({ buildingId, onClose }: { buildingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    year: 1403, month: new Date().getMonth() + 1, method: 'MIXED',
    baseAmount: 1500000, penaltyPerDay: 50000, dueDate: todayJalali(),
  });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function doPreview() {
    setLoading(true); setError('');
    try {
      const res = await api.post(`/buildings/${buildingId}/charges/preview`, payload());
      setPreview(res.data.data);
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  async function doCreate() {
    setLoading(true); setError('');
    try {
      await api.post(`/buildings/${buildingId}/charges`, payload());
      qc.invalidateQueries({ queryKey: ['charge-periods', buildingId] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  function payload() {
    return {
      year: Number(form.year), month: Number(form.month), method: form.method,
      baseAmount: Number(form.baseAmount), penaltyPerDay: Number(form.penaltyPerDay), dueDate: form.dueDate,
      items: [
        { title: 'نظافت (مساوی)', method: 'EQUAL', amount: 8000000 },
        { title: 'آسانسور (نفری)', method: 'BY_PERSON', amount: 6000000 },
        { title: 'تاسیسات (متراژی)', method: 'BY_AREA', amount: 10000000 },
      ],
    };
  }

  return (
    <Modal open onClose={onClose} title="تعریف دوره‌ی شارژ جدید">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">سال (شمسی)</label>
          <input className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} /></div>
        <div><label className="label">ماه</label>
          <select className="input" value={form.month} onChange={(e) => setForm({ ...form, month: +e.target.value })}>
            {['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select></div>
        <div><label className="label">روش محاسبه</label>
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="MIXED">ترکیبی</option><option value="EQUAL">مساوی</option>
            <option value="BY_AREA">متراژی</option><option value="BY_PERSON">نفری</option>
          </select></div>
        <div><label className="label">شارژ ثابت پایه (ریال)</label>
          <input className="input" type="number" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: +e.target.value })} /></div>
        <div><label className="label">جریمه روزانه (ریال)</label>
          <input className="input" type="number" value={form.penaltyPerDay} onChange={(e) => setForm({ ...form, penaltyPerDay: +e.target.value })} /></div>
        <div><label className="label">سررسید</label>
          <JalaliDateInput value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} /></div>
      </div>

      {preview && (
        <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-gray-100 p-3">
          <div className="mb-2 text-sm font-medium">جمع کل: {formatRial(preview.total)} · {faNumber(preview.unitsCount)} واحد</div>
          <table className="w-full text-xs">
            <tbody>
              {preview.charges.map((c: any) => (
                <tr key={c.unitId} className="border-b border-gray-50">
                  <td className="py-1">واحد {c.code}</td>
                  <td className="py-1 text-left font-medium">{formatRial(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={doPreview} disabled={loading}>پیش‌نمایش محاسبه</button>
        <button className="btn-primary" onClick={doCreate} disabled={loading || !preview}>ثبت دوره (پیش‌نویس)</button>
      </div>
    </Modal>
  );
}

function methodLabel(m: string) {
  return ({ EQUAL: 'مساوی', BY_AREA: 'متراژی', BY_PERSON: 'نفری', MIXED: 'ترکیبی', FIXED: 'ثابت', COEFFICIENT: 'ضریبی', CUSTOM_FORMULA: 'فرمول' } as any)[m] ?? m;
}
