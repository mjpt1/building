'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toFaDigits } from '@/lib/jalali';
import { PageHeader, Loading, EmptyState, Modal } from '@/components/ui';

export default function ResidentsPage() {
  const { buildingId } = useAuth();
  const [tab, setTab] = useState<'residents' | 'owners'>('residents');
  const [show, setShow] = useState(false);

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  return (
    <div>
      <PageHeader title="ساکنین و مالکین" subtitle="مدیریت اشخاص ساختمان"
        action={<button className="btn-primary" onClick={() => setShow(true)}><Plus size={16} /> {tab === 'residents' ? 'ساکن جدید' : 'مالک جدید'}</button>} />

      <div className="mb-4 flex gap-2">
        {(['residents', 'owners'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {t === 'residents' ? 'ساکنین' : 'مالکین'}
          </button>
        ))}
      </div>

      <PeopleList buildingId={buildingId} kind={tab} />
      {show && <CreateModal buildingId={buildingId} kind={tab} onClose={() => setShow(false)} />}
    </div>
  );
}

function PeopleList({ buildingId, kind }: { buildingId: string; kind: 'residents' | 'owners' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['people', buildingId, kind],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/${kind}`, { limit: 100 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="موردی ثبت نشده است." />;

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead><tr><th className="th">نام</th><th className="th">موبایل</th><th className="th">کد ملی</th><th className="th">{kind === 'residents' ? 'واحد' : 'واحدها'}</th></tr></thead>
        <tbody>
          {data.map((p: any) => (
            <tr key={p.id}>
              <td className="td font-medium">{p.fullName}</td>
              <td className="td text-gray-500" dir="ltr">{toFaDigits(p.mobile)}</td>
              <td className="td">{p.nationalId ? toFaDigits(p.nationalId) : '—'}</td>
              <td className="td">{kind === 'residents'
                ? (p.currentUnits?.map((u: any) => `واحد ${u.code}`).join('، ') || '—')
                : `${toFaDigits(p._count?.ownedUnits ?? 0)} واحد`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateModal({ buildingId, kind, onClose }: { buildingId: string; kind: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: '', mobile: '', nationalId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError('');
    try {
      await api.post(`/buildings/${buildingId}/${kind}`, form);
      qc.invalidateQueries({ queryKey: ['people', buildingId, kind] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={kind === 'residents' ? 'ثبت ساکن' : 'ثبت مالک'}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">نام و نام خانوادگی</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><label className="label">موبایل</label><input className="input text-center" dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^0-9]/g, '') })} /></div>
        <div><label className="label">کد ملی (اختیاری)</label><input className="input text-center" dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>ثبت</button>
      </div>
    </Modal>
  );
}
