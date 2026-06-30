'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Pin } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { PageHeader, Loading, EmptyState, Modal } from '@/components/ui';

export default function AnnouncementsPage() {
  const { buildingId, hasPerm } = useAuth();
  const [show, setShow] = useState(false);

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  return (
    <div>
      <PageHeader title="اطلاعیه‌ها" subtitle="ارتباط با ساکنین و مالکین"
        action={hasPerm('announcement:create') ? <button className="btn-primary" onClick={() => setShow(true)}><Plus size={16} /> اطلاعیه جدید</button> : null} />
      <List buildingId={buildingId} />
      {show && <CreateModal buildingId={buildingId} onClose={() => setShow(false)} />}
    </div>
  );
}

function List({ buildingId }: { buildingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/announcements`, { limit: 50 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState icon={<Megaphone size={32} />} text="اطلاعیه‌ای ثبت نشده است." />;

  return (
    <div className="space-y-3">
      {data.map((a: any) => (
        <div key={a.id} className="card">
          <div className="mb-2 flex items-center gap-2">
            {a.isPinned && <Pin size={14} className="text-brand-600" />}
            <h3 className="font-bold text-gray-800">{a.title}</h3>
            <span className="mr-auto text-xs text-gray-400">{a.publishedAt?.jalali}</span>
          </div>
          <p className="text-sm text-gray-600">{a.body}</p>
          <div className="mt-2 text-xs text-gray-400">{a.author} · {a.readsCount} بازدید</div>
        </div>
      ))}
    </div>
  );
}

function CreateModal({ buildingId, onClose }: { buildingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', sendSms: false, isPinned: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError('');
    try {
      await api.post(`/buildings/${buildingId}/announcements`, form);
      qc.invalidateQueries({ queryKey: ['announcements', buildingId] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="ثبت اطلاعیه">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">عنوان</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">متن</label><textarea className="input" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <div><label className="label">مخاطب</label>
          <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            <option value="ALL">همه</option><option value="RESIDENTS">ساکنین</option><option value="OWNERS">مالکین</option>
          </select></div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.sendSms} onChange={(e) => setForm({ ...form, sendSms: e.target.checked })} /> ارسال پیامک</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} /> سنجاق بالای لیست</label>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>انتشار</button>
      </div>
    </Modal>
  );
}
