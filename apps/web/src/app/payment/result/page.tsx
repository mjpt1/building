'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toFaDigits } from '@/lib/jalali';

function Result() {
  const params = useSearchParams();
  const success = params.get('success') === 'true';
  const message = params.get('message') ?? '';
  const refId = params.get('refId');
  const receiptNo = params.get('receiptNo');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="card w-full max-w-md text-center">
        {success ? (
          <CheckCircle2 size={64} className="mx-auto text-success" />
        ) : (
          <XCircle size={64} className="mx-auto text-danger" />
        )}
        <h1 className="mt-4 text-xl font-bold text-gray-800">
          {success ? 'پرداخت موفق بود' : 'پرداخت ناموفق'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>

        {success && (
          <dl className="mt-5 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
            {refId && <div className="flex justify-between"><dt className="text-gray-500">کد رهگیری</dt><dd dir="ltr">{toFaDigits(refId)}</dd></div>}
            {receiptNo && <div className="flex justify-between"><dt className="text-gray-500">شماره رسید</dt><dd dir="ltr">{receiptNo}</dd></div>}
          </dl>
        )}

        <Link href="/dashboard" className="btn-primary mt-6 w-full">بازگشت به داشبورد</Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <Result />
    </Suspense>
  );
}
