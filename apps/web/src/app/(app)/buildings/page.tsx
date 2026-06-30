'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Home, Plus, Pencil } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { faNumber } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge, Modal } from '@/components/ui';

export default function BuildingsPage() {
  const { buildingId, hasPerm } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(buildingId);
  const [buildingModal, setBuildingModal] = useState<{ open: boolean; edit?: any }>({ open: false });

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => (await fetchData('/buildings')).data,
  });

  const activeId = selected ?? buildings?.[0]?.id;

  return (
    <div>
      <PageHeader
        title="ساختمان‌ها و واحدها"
        subtitle="مدیریت ساختمان‌ها، طبقات و واحدها"
        action={
          hasPerm('building:create') ? (
            <button className="btn-primary" onClick={() => setBuildingModal({ open: true })}>
              <Plus size={16} /> ساختمان جدید
            </button>
          ) : null
        }
      />
      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            {buildings?.map((b: any) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 rounded-xl border p-3 transition ${
                  activeId === b.id ? 'border-brand-300 bg-brand-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <button onClick={() => setSelected(b.id)} className="flex flex-1 items-center gap-3 text-right">
                  <Building2 size={20} className="text-brand-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{b.name}</div>
                    <div className="text-xs text-gray-400">
                      {faNumber(b.unitsCount)} واحد · {b.city ?? '—'}
                    </div>
                  </div>
                </button>
                {hasPerm('building:update') && (
                  <button
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-brand-600"
                    title="ویرایش ساختمان"
                    onClick={() => setBuildingModal({ open: true, edit: b })}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            ))}
            {buildings?.length === 0 && <EmptyState text="ساختمانی ثبت نشده." />}
          </div>
          <div className="lg:col-span-3">{activeId && <UnitsPanel buildingId={activeId} />}</div>
        </div>
      )}

      {buildingModal.open && (
        <BuildingModal
          edit={buildingModal.edit}
          onClose={() => setBuildingModal({ open: false })}
          onSaved={() => qc.invalidateQueries({ queryKey: ['buildings'] })}
        />
      )}
    </div>
  );
}

// ───────────── پنل واحدها + طبقات ─────────────
function UnitsPanel({ buildingId }: { buildingId: string }) {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const [unitModal, setUnitModal] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [floorModal, setFloorModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: async () => await fetchData(`/buildings/${buildingId}/units`, { limit: 100 }),
  });
  const { data: floors } = useQuery({
    queryKey: ['floors', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/floors`)).data,
  });
  const { data: owners } = useQuery({
    queryKey: ['owners-list', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/owners`, { limit: 100 })).data,
  });
  const { data: residents } = useQuery({
    queryKey: ['residents-list', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/residents`, { limit: 100 })).data,
  });

  const units = data?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['units', buildingId] });

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-800">
          <Home size={18} /> واحدها
        </h3>
        {hasPerm('unit:create') && (
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setFloorModal(true)}>
              <Plus size={15} /> طبقه
            </button>
            <button className="btn-primary" onClick={() => setUnitModal({ open: true })}>
              <Plus size={15} /> واحد جدید
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : units.length === 0 ? (
        <EmptyState text="واحدی ثبت نشده. با دکمه‌ی «واحد جدید» شروع کنید." />
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">واحد</th>
                <th className="th">طبقه</th>
                <th className="th">متراژ</th>
                <th className="th">نفرات</th>
                <th className="th">مالک</th>
                <th className="th">ساکن</th>
                <th className="th">وضعیت</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u: any) => (
                <tr key={u.id}>
                  <td className="td font-medium">واحد {u.code}</td>
                  <td className="td">{u.floor?.title ?? '—'}</td>
                  <td className="td">{faNumber(Number(u.area))} م²</td>
                  <td className="td">{faNumber(u.residentsCount)}</td>
                  <td className="td">{u.owner?.fullName ?? '—'}</td>
                  <td className="td">{u.currentResident?.fullName ?? '—'}</td>
                  <td className="td">
                    <StatusBadge status={u.occupancyStatus === 'OCCUPIED' ? 'PAID' : 'PENDING'} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {hasPerm('unit:update') && (
                        <button
                          className="text-gray-400 hover:text-brand-600"
                          title="ویرایش"
                          onClick={() => setUnitModal({ open: true, edit: u })}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <Link href={`/buildings/units/${u.id}`} className="text-brand-600 hover:underline">
                        جزئیات
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unitModal.open && (
        <UnitModal
          buildingId={buildingId}
          floors={floors ?? []}
          owners={owners ?? []}
          residents={residents ?? []}
          edit={unitModal.edit}
          onClose={() => setUnitModal({ open: false })}
          onSaved={refresh}
        />
      )}
      {floorModal && (
        <FloorModal
          buildingId={buildingId}
          onClose={() => setFloorModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['floors', buildingId] })}
        />
      )}
    </div>
  );
}

// ───────────── مودال ساختمان (ساخت/ویرایش) ─────────────
function BuildingModal({ edit, onClose, onSaved }: { edit?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: edit?.name ?? '',
    address: edit?.address ?? '',
    city: edit?.city ?? '',
    postalCode: edit?.postalCode ?? '',
    managerName: edit?.managerName ?? '',
    managerPhone: edit?.managerPhone ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (edit) await api.put(`/buildings/${edit.id}`, form);
      else await api.post('/buildings', form);
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? 'ویرایش ساختمان' : 'ساختمان جدید'}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <Field label="نام ساختمان *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="آدرس" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="شهر" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="کد پستی" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} dir="ltr" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام مدیر" value={form.managerName} onChange={(v) => setForm({ ...form, managerName: v })} />
          <Field label="تلفن مدیر" value={form.managerPhone} onChange={(v) => setForm({ ...form, managerPhone: v })} dir="ltr" />
        </div>
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} />
    </Modal>
  );
}

// ───────────── مودال واحد (ساخت/ویرایش) ─────────────
function UnitModal({
  buildingId,
  floors,
  owners,
  residents,
  edit,
  onClose,
  onSaved,
}: {
  buildingId: string;
  floors: any[];
  owners: any[];
  residents: any[];
  edit?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: edit?.code ?? '',
    floorId: edit?.floorId ?? '',
    area: edit?.area ? Number(edit.area) : 0,
    residentsCount: edit?.residentsCount ?? 0,
    occupancyStatus: edit?.occupancyStatus ?? 'VACANT',
    hasParking: edit?.hasParking ?? false,
    parkingCount: edit?.parkingCount ?? 0,
    hasStorage: edit?.hasStorage ?? false,
    storageCount: edit?.storageCount ?? 0,
    coefficient: edit?.coefficient ? Number(edit.coefficient) : 1,
    ownerId: edit?.ownerId ?? '',
    currentResidentId: edit?.currentResidentId ?? '',
    description: edit?.description ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        floorId: form.floorId || undefined,
        ownerId: form.ownerId || undefined,
        currentResidentId: form.currentResidentId || undefined,
      };
      if (edit) await api.put(`/units/${edit.id}`, payload);
      else await api.post(`/buildings/${buildingId}/units`, payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? `ویرایش واحد ${edit.code}` : 'واحد جدید'}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="شماره واحد *" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
          <div>
            <label className="label">طبقه</label>
            <select className="input" value={form.floorId} onChange={(e) => setForm({ ...form, floorId: e.target.value })}>
              <option value="">— بدون طبقه —</option>
              {floors.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.title ?? `طبقه ${f.number}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="متراژ (م²)" value={form.area} onChange={(v) => setForm({ ...form, area: v })} />
          <NumField label="تعداد نفرات" value={form.residentsCount} onChange={(v) => setForm({ ...form, residentsCount: v })} />
          <NumField label="ضریب شارژ" value={form.coefficient} onChange={(v) => setForm({ ...form, coefficient: v })} step="0.1" />
        </div>
        <div>
          <label className="label">وضعیت سکونت</label>
          <select
            className="input"
            value={form.occupancyStatus}
            onChange={(e) => setForm({ ...form, occupancyStatus: e.target.value })}
          >
            <option value="OCCUPIED">سکونت دارد</option>
            <option value="VACANT">خالی</option>
            <option value="UNDER_RENOVATION">در حال بازسازی</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">مالک</label>
            <select className="input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              <option value="">— انتخاب مالک —</option>
              {owners.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">ساکن فعلی</label>
            <select
              className="input"
              value={form.currentResidentId}
              onChange={(e) => setForm({ ...form, currentResidentId: e.target.value })}
            >
              <option value="">— انتخاب ساکن —</option>
              {residents.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasParking}
              onChange={(e) => setForm({ ...form, hasParking: e.target.checked })}
            />
            <span className="text-sm">پارکینگ</span>
            {form.hasParking && (
              <input
                type="number"
                className="input !w-16 !py-1"
                value={form.parkingCount}
                onChange={(e) => setForm({ ...form, parkingCount: +e.target.value })}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasStorage}
              onChange={(e) => setForm({ ...form, hasStorage: e.target.checked })}
            />
            <span className="text-sm">انباری</span>
            {form.hasStorage && (
              <input
                type="number"
                className="input !w-16 !py-1"
                value={form.storageCount}
                onChange={(e) => setForm({ ...form, storageCount: +e.target.value })}
              />
            )}
          </div>
        </div>
        <Field label="توضیحات" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} />
    </Modal>
  );
}

// ───────────── مودال طبقه ─────────────
function FloorModal({ buildingId, onClose, onSaved }: { buildingId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ number: 1, title: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await api.post(`/buildings/${buildingId}/floors`, { number: Number(form.number), title: form.title || undefined });
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="طبقه جدید">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <NumField label="شماره طبقه *" value={form.number} onChange={(v) => setForm({ ...form, number: v })} />
        <Field label="عنوان (اختیاری)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} />
    </Modal>
  );
}

// ───────────── اجزای کمکی فرم ─────────────
function Field({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" dir={dir as any} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        step={step}
        className="input text-center"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
function ModalActions({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: () => void; loading: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button className="btn-ghost" onClick={onClose}>
        انصراف
      </button>
      <button className="btn-primary" onClick={onSubmit} disabled={loading}>
        {loading ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
    </div>
  );
}
