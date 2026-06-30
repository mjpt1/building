'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, tokenStore, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toEnDigits, toFaDigits } from '@/lib/jalali';

type Tab = 'password' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { loadMe } = useAuth();
  const [tab, setTab] = useState<Tab>('password');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function afterLogin(data: any) {
    tokenStore.set(data.accessToken, data.refreshToken);
    await loadMe();
    router.push('/dashboard');
  }

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { mobile: toEnDigits(mobile), password });
      await afterLogin(res.data.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp() {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/otp/request', { mobile: toEnDigits(mobile), purpose: 'LOGIN' });
      setOtpSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/otp/verify', { mobile: toEnDigits(mobile), code: toEnDigits(code), purpose: 'LOGIN' });
      await afterLogin(res.data.data);
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
          <h1 className="text-2xl font-bold text-brand-900">سامان</h1>
          <p className="mt-1 text-sm text-gray-500">سامانه جامع مدیریت ساختمان</p>
        </div>

        <div className="card">
          <div className="mb-5 flex rounded-lg bg-gray-100 p-1">
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${tab === 'password' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'}`}
              onClick={() => { setTab('password'); setError(''); }}
            >
              ورود با رمز
            </button>
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${tab === 'otp' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'}`}
              onClick={() => { setTab('otp'); setError(''); }}
            >
              ورود با کد پیامکی
            </button>
          </div>

          {error && <div className="mb-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}

          {tab === 'password' ? (
            <form onSubmit={loginPassword} className="space-y-4">
              <div>
                <label className="label">شماره موبایل</label>
                <input className="input text-center" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={toFaDigits(mobile)} onChange={(e) => setMobile(toEnDigits(e.target.value))} />
              </div>
              <div>
                <label className="label">رمز عبور</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={loading}>{loading ? 'در حال ورود…' : 'ورود'}</button>
              <div className="text-center">
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">رمز عبور را فراموش کرده‌اید؟</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="label">شماره موبایل</label>
                <input className="input text-center" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={toFaDigits(mobile)} onChange={(e) => setMobile(toEnDigits(e.target.value))} disabled={otpSent} />
              </div>
              {otpSent && (
                <div>
                  <label className="label">کد تایید پیامک‌شده</label>
                  <input className="input text-center tracking-[0.4em]" dir="ltr" placeholder="-----"
                    value={toFaDigits(code)} onChange={(e) => setCode(toEnDigits(e.target.value))} />
                </div>
              )}
              {!otpSent ? (
                <button type="button" className="btn-primary w-full" disabled={loading} onClick={requestOtp}>
                  {loading ? 'در حال ارسال…' : 'دریافت کد'}
                </button>
              ) : (
                <button className="btn-primary w-full" disabled={loading}>{loading ? 'بررسی…' : 'ورود'}</button>
              )}
            </form>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
            حساب کاربری ندارید؟{' '}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">ثبت‌نام</Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          نسخه آزمایشی: کد OTP در حالت توسعه در لاگ سرور چاپ می‌شود.
        </p>
      </div>
    </div>
  );
}
