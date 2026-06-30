'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toFaDigits } from '@/lib/jalali';
import { PageHeader, Loading, EmptyState, Modal } from '@/components/ui';

type Kind = 'residents' | 'owners';

export default function ResidentsPage() {
  const { buildingId, hasPerm } = useAuth();
  const [tab, setTab] = useState<Kind>('residents');
  const [modal, setModal] = useState<{ open: boolean; edit?: any }>({ open: false });

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  const canCreate = tab === 'residents' ? hasPerm('resident:create') : hasPerm('owner:create');

  return (
    <div>
      <PageHeader
        title="ساکنین و مالکین"
        subtitle="مدیریت اشخاص ساختمان"
        action={
          canCreate ? (
            <button className="btn-primary" onClick={() => setModal({ open: true })}>
              <Plus size={16} /> {tab === 'residents' ? 'ساکن جدید' : 'مالک جدید'}
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2">
        {(['residents', 'owners'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {t === 'residents' ? 'ساکنین' : 'مالکین'}
          </button>
        ))}
      </div>

      <PeopleList buildingId={buildingId} kind={tab} onEdit={(p) => setModal({ open: true, edit: p })} />
      {modal.open && (
        <PersonModal
          buildingId={buildingId}
          kind={tab}
          edit={modal.edit}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}

function PeopleList({ buildingId, kind, onEdit }: { buildingId: string; kind: Kind; onEdit: (p: any) => void }) {
  const qc = useQueryClient();
  const { hasPerm } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['people', buildingId, kind],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/${kind}`, { limit: 100 })).data,
  });

  async function remove(id: string) {
    if (!confirm('این ساکن حذف شود؟')) return;
    await api.delete(`/residents/${id}`);
    qc.invalidateQueries({ queryKey: ['people', buildingId, kind] });
  }

  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="موردی ثبت نشده است." />;

  const canEdit = kind === 'residents' ? hasPerm('resident:update') : hasPerm('owner:update');
  const canDelete = kind === 'residents' && hasPerm('resident:delete');

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">نام</th>
            <th className="th">موبایل</th>
            <th className="th">کد ملی</th>
            <th className="th">{kind === 'residents' ? 'واحد' : 'واحدها'}</th>
            <th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((p: any) => (
            <tr key={p.id}>
              <td className="td font-medium">{p.fullName}</td>
              <td className="td text-gray-500" dir="ltr">{toFaDigits(p.mobile)}</td>
              <td className="td">{p.nationalId ? toFaDigits(p.nationalId) : '—'}</td>
              <td className="td">
                {kind === 'residents'
                  ? p.currentUnits?.map((u: any) => `واحد ${u.code}`).join('، ') || '—'
                  : `${toFaDigits(p._count?.ownedUnits ?? 0)} واحد`}
              </td>
              <td className="td">
                <div className="flex items-center gap-3">
                  {canEdit && (
                    <button className="text-gray-400 hover:text-brand-600" title="ویرایش" onClick={() => onEdit(p)}>
                      <Pencil size={15} />
                    </button>
                  )}
                  {canDelete && (
                    <button className="text-gray-400 hover:text-danger" title="حذف" onClick={() => remove(p.id)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersonModal({ buildingId, kind, edit, onClose }: { buildingId: string; kind: Kind; edit?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isResident = kind === 'residents';
  const [form, setForm] = useState({
    fullName: edit?.fullName ?? '',
    mobile: edit?.mobile ?? '',
    nationalId: edit?.nationalId ?? '',
    email: edit?.email ?? '',
    iban: edit?.iban ?? '',
    address: edit?.address ?? '',
    notes: edit?.notes ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const base: any = { fullName: form.fullName, mobile: form.mobile, nationalId: form.nationalId || undefined, email: form.email || undefined };
      const payload = isResident ? base : { ...base, iban: form.iban || undefined, address: form.address || undefined, notes: form.notes || undefined };
      if (edit) await api.put(`/${kind}/${edit.id}`, payload);
      else await api.post(`/buildings/${buildingId}/${kind}`, payload);
      qc.invalidateQueries({ queryKey: ['people', buildingId, kind] });
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  const title = `${edit ? 'ویرایش' : 'ثبت'} ${isResident ? 'ساکن' : 'مالک'}`;

  return (
    <Modal open onClose={onClose} title={title}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div>
          <label className="label">نام و نام خانوادگی *</label>
          <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">موبایل *</label>
            <input
              className="input text-center"
              dir="ltr"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^0-9]/g, '') })}
            />
          </div>
          <div>
            <label className="label">کد ملی</label>
            <input className="input text-center" dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">ایمیل</label>
          <input className="input" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {!isResident && (
          <>
            <div>
              <label className="label">شماره شبا (IBAN)</label>
              <input className="input" dir="ltr" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            </div>
            <div>
              <label className="label">آدرس</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>
    </Modal>
  );
}
