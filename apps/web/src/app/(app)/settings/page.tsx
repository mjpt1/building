'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toFaDigits } from '@/lib/jalali';
import { PageHeader, Loading } from '@/components/ui';

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await fetchData('/users/me/profile')).data,
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');

  async function changePassword() {
    setMsg('');
    try {
      await api.post('/auth/password/change', pw);
      setMsg('رمز عبور با موفقیت تغییر کرد.');
      setPw({ currentPassword: '', newPassword: '' });
    } catch (e) { setMsg(apiError(e)); }
  }

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader title="تنظیمات و پروفایل" subtitle="مدیریت حساب کاربری" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-bold text-gray-800">اطلاعات حساب</h3>
          <dl className="space-y-3 text-sm">
            <Row k="نام" v={profile?.fullName} />
            <Row k="موبایل" v={toFaDigits(profile?.mobile ?? '')} />
            <Row k="نقش‌ها" v={user?.roles.join('، ')} />
            <Row k="ایمیل" v={profile?.email ?? '—'} />
          </dl>
        </div>

        <div className="card">
          <h3 className="mb-4 font-bold text-gray-800">تغییر رمز عبور</h3>
          {msg && <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{msg}</div>}
          <div className="space-y-3">
            <div><label className="label">رمز فعلی</label><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
            <div><label className="label">رمز جدید</label><input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            <button className="btn-primary w-full" onClick={changePassword}>تغییر رمز</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return <div className="flex justify-between border-b border-gray-50 pb-2"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-gray-800">{v ?? '—'}</dd></div>;
}
