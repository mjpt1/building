'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { PageHeader, Loading, EmptyState, StatusBadge, Modal } from '@/components/ui';

export default function MaintenancePage() {
  const { buildingId } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('');

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  return (
    <div>
      <PageHeader title="تعمیرات و نگهداری" subtitle="ثبت و پیگیری درخواست‌های تعمیر"
        action={<button className="btn-primary" onClick={() => setShow(true)}><Plus size={16} /> درخواست جدید</button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'همه'], ['SUBMITTED', 'ثبت‌شده'], ['IN_PROGRESS', 'در حال انجام'], ['DONE', 'انجام‌شده']].map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`rounded-lg px-3 py-1.5 text-sm ${status === v ? 'bg-brand-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{l}</button>
        ))}
      </div>

      <RequestList buildingId={buildingId} status={status} />
      {show && <CreateModal buildingId={buildingId} onClose={() => setShow(false)} />}
    </div>
  );
}

function RequestList({ buildingId, status }: { buildingId: string; status: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['maint', buildingId, status],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/maintenance`, { status: status || undefined, limit: 50 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="درخواستی ثبت نشده است." />;

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead><tr>
          <th className="th">کد</th><th className="th">عنوان</th><th className="th">واحد</th>
          <th className="th">دسته</th><th className="th">اولویت</th><th className="th">وضعیت</th>
          <th className="th">تکنسین</th><th className="th"></th>
        </tr></thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id}>
              <td className="td text-gray-400" dir="ltr">{r.trackingNo}</td>
              <td className="td font-medium">{r.title}</td>
              <td className="td">{r.unitCode ? `واحد ${r.unitCode}` : '—'}</td>
              <td className="td">{r.category ?? '—'}</td>
              <td className="td"><StatusBadge status={r.priority} /></td>
              <td className="td"><StatusBadge status={r.status} /></td>
              <td className="td">{r.assignedTo ?? '—'}</td>
              <td className="td"><Link href={`/maintenance/${r.id}`} className="text-brand-600 hover:underline">جزئیات</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateModal({ buildingId, onClose }: { buildingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'NORMAL' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError('');
    try {
      await api.post(`/buildings/${buildingId}/maintenance`, form);
      qc.invalidateQueries({ queryKey: ['maint', buildingId] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="ثبت درخواست تعمیر">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">عنوان</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">شرح مشکل</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">دسته</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="برق، آسانسور..." /></div>
          <div><label className="label">اولویت</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="NORMAL">عادی</option><option value="IMPORTANT">مهم</option><option value="URGENT">فوری</option>
            </select></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>ثبت درخواست</button>
      </div>
    </Modal>
  );
}
