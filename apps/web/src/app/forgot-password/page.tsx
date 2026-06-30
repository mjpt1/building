'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiError } from '@/lib/api';
import { toEnDigits, toFaDigits } from '@/lib/jalali';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/request', { mobile: toEnDigits(mobile), purpose: 'RESET_PASSWORD' });
      setStep(2);
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  async function reset() {
    setLoading(true); setError('');
    try {
      await api.post('/auth/password/reset', { mobile: toEnDigits(mobile), code: toEnDigits(code), newPassword });
      setMsg('رمز عبور تغییر کرد. در حال انتقال به صفحه ورود…');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-brand-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-xl font-bold text-brand-900">بازیابی رمز عبور</h1>
        <div className="card">
          {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
          {msg && <div className="mb-3 rounded-lg bg-success-light px-3 py-2 text-sm text-success-dark">{msg}</div>}
          {step === 1 ? (
            <div className="space-y-4">
              <div><label className="label">شماره موبایل</label>
                <input className="input text-center" dir="ltr" value={toFaDigits(mobile)} onChange={(e) => setMobile(toEnDigits(e.target.value))} /></div>
              <button className="btn-primary w-full" onClick={requestCode} disabled={loading}>دریافت کد بازیابی</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div><label className="label">کد تایید</label>
                <input className="input text-center tracking-widest" dir="ltr" value={toFaDigits(code)} onChange={(e) => setCode(toEnDigits(e.target.value))} /></div>
              <div><label className="label">رمز جدید</label>
                <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <button className="btn-primary w-full" onClick={reset} disabled={loading}>تغییر رمز</button>
            </div>
          )}
          <div className="mt-5 text-center text-sm text-gray-500">
            <Link href="/login" className="text-brand-600 hover:underline">بازگشت به ورود</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
