'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, tokenStore, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toEnDigits, toFaDigits } from '@/lib/jalali';

export default function RegisterPage() {
  const router = useRouter();
  const { loadMe } = useAuth();
  const [form, setForm] = useState({ fullName: '', mobile: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        fullName: form.fullName,
        mobile: toEnDigits(form.mobile),
        password: form.password,
      });
      const data = res.data.data;
      tokenStore.set(data.accessToken, data.refreshToken);
      await loadMe();
      router.push('/dashboard');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-brand-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-2xl text-white">🏢</div>
          <h1 className="text-2xl font-bold text-brand-900">ثبت‌نام در سامان</h1>
        </div>
        <div className="card">
          {error && <div className="mb-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">نام و نام خانوادگی</label>
              <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="label">شماره موبایل</label>
              <input className="input text-center" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={toFaDigits(form.mobile)} onChange={(e) => setForm({ ...form, mobile: toEnDigits(e.target.value) })} />
            </div>
            <div>
              <label className="label">رمز عبور (حداقل ۸ کاراکتر)</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'در حال ثبت…' : 'ثبت‌نام'}</button>
          </form>
          <div className="mt-5 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
            حساب دارید؟{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">ورود</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
