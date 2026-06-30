'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCog } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toFaDigits } from '@/lib/jalali';
import { PageHeader, Loading, EmptyState, Modal } from '@/components/ui';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر کل', BUILDING_MANAGER: 'مدیر ساختمان', ACCOUNTANT: 'حسابدار',
  RESIDENT: 'ساکن', OWNER: 'مالک', TECHNICIAN: 'تکنسین',
};

export default function UsersPage() {
  const { hasPerm } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<any>(null);

  if (!hasPerm('user:read')) return <EmptyState text="دسترسی مشاهده کاربران را ندارید." />;

  return (
    <div>
      <PageHeader
        title="مدیریت کاربران"
        subtitle="کاربران سامانه و نقش‌های آن‌ها"
        action={hasPerm('user:create') ? <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> کاربر جدید</button> : null}
      />
      <UsersList onAssign={setAssignFor} />
      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
      {assignFor && <AssignRoleModal user={assignFor} onClose={() => setAssignFor(null)} />}
    </div>
  );
}

function UsersList({ onAssign }: { onAssign: (u: any) => void }) {
  const { hasPerm } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await fetchData('/users', { limit: 100 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState />;

  return (
    <div className="table-wrap">
      <table className="w-full">
        <thead><tr><th className="th">نام</th><th className="th">موبایل</th><th className="th">نقش‌ها</th><th className="th">وضعیت</th><th className="th"></th></tr></thead>
        <tbody>
          {data.map((u: any) => (
            <tr key={u.id}>
              <td className="td font-medium">{u.fullName}</td>
              <td className="td text-gray-500" dir="ltr">{toFaDigits(u.mobile)}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  {u.roles?.length ? u.roles.map((r: any) => (
                    <span key={r.id} className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{ROLE_LABELS[r.key] ?? r.key}</span>
                  )) : <span className="text-xs text-gray-400">بدون نقش</span>}
                </div>
              </td>
              <td className="td">{u.isActive ? <span className="text-success">فعال</span> : <span className="text-danger">غیرفعال</span>}</td>
              <td className="td">
                {hasPerm('role:assign') && (
                  <button className="flex items-center gap-1 text-brand-600 hover:underline" onClick={() => onAssign(u)}>
                    <UserCog size={15} /> تخصیص نقش
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: '', mobile: '', password: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError('');
    try {
      await api.post('/users', { fullName: form.fullName, mobile: form.mobile, password: form.password, email: form.email || undefined });
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="کاربر جدید">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">نام و نام خانوادگی *</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><label className="label">موبایل *</label><input className="input text-center" dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^0-9]/g, '') })} /></div>
        <div><label className="label">رمز عبور (حداقل ۸ کاراکتر) *</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><label className="label">ایمیل</label><input className="input" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>ثبت</button>
      </div>
    </Modal>
  );
}

function AssignRoleModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { buildingId } = useAuth();
  const [roleKey, setRoleKey] = useState('RESIDENT');
  const [scope, setScope] = useState<'building' | 'global'>('building');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await fetchData('/rbac/roles')).data,
  });

  async function submit() {
    setLoading(true); setError('');
    try {
      await api.post('/rbac/assign', {
        userId: user.id,
        roleKey,
        buildingId: scope === 'building' ? buildingId : undefined,
      });
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={`تخصیص نقش به ${user.fullName}`}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div>
          <label className="label">نقش</label>
          <select className="input" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            {(roles ?? []).map((r: any) => <option key={r.key} value={r.key}>{r.label ?? r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">دامنه‌ی دسترسی</label>
          <select className="input" value={scope} onChange={(e) => setScope(e.target.value as any)}>
            <option value="building">محدود به ساختمان جاری</option>
            <option value="global">سراسری (همه ساختمان‌ها)</option>
          </select>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>تخصیص</button>
      </div>
    </Modal>
  );
}
