'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge, Modal } from '@/components/ui';

export default function ChargePeriodPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPerm } = useAuth();
  const [msg, setMsg] = useState('');
  const [payFor, setPayFor] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['period', id],
    queryFn: async () => (await fetchData(`/charge-periods/${id}`)).data,
  });

  async function approve() {
    try {
      await api.post(`/charge-periods/${id}/approve`);
      qc.invalidateQueries({ queryKey: ['period', id] });
      setMsg('دوره تایید و به ساکنین ابلاغ شد.');
    } catch (e) {
      setMsg(apiError(e));
    }
  }

  if (isLoading) return <Loading />;
  if (!data) return <EmptyState />;

  return (
    <div>
      <PageHeader
        title={data.title}
        subtitle={`سررسید: ${data.dueDateJalali?.jalali} · جمع کل: ${formatRial(data.totalAmount)}`}
        action={
          data.status === 'DRAFT' && hasPerm('charge:approve') ? (
            <button className="btn-primary" onClick={approve}>
              تایید و ابلاغ
            </button>
          ) : (
            <StatusBadge status={data.status} />
          )
        }
      />
      {msg && <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{msg}</div>}

      <div className="table-wrap">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">واحد</th>
              <th className="th">مبلغ شارژ</th>
              <th className="th">جریمه</th>
              <th className="th">پرداختی</th>
              <th className="th">مانده</th>
              <th className="th">وضعیت</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {data.charges.map((c: any) => {
              const remaining = Math.max(0, c.amount + c.penaltyAmount - c.paidAmount);
              return (
                <tr key={c.id}>
                  <td className="td font-medium">واحد {c.unitCode}</td>
                  <td className="td">{formatRial(c.amount)}</td>
                  <td className="td">{formatRial(c.penaltyAmount)}</td>
                  <td className="td">{formatRial(c.paidAmount)}</td>
                  <td className="td font-medium">{formatRial(remaining)}</td>
                  <td className="td">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="td">
                    {remaining > 0 && hasPerm('payment:create') && (
                      <button
                        className="btn-primary !px-3 !py-1 text-xs"
                        onClick={() => setPayFor({ ...c, remaining })}
                      >
                        ثبت پرداخت
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payFor && (
        <PaymentModal
          buildingId={data.buildingId}
          charge={payFor}
          onClose={() => setPayFor(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['period', id] })}
        />
      )}
    </div>
  );
}

function PaymentModal({
  buildingId,
  charge,
  onClose,
  onSaved,
}: {
  buildingId: string;
  charge: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number>(charge.remaining);
  const [method, setMethod] = useState('CASH');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await api.post(`/payments/manual/${buildingId}`, {
        chargeId: charge.id,
        amount: Number(amount),
        method,
        type: 'CHARGE',
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`ثبت پرداخت — واحد ${charge.unitCode}`}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          مانده‌ی بدهی این واحد: <span className="font-bold text-gray-800">{formatRial(charge.remaining)}</span>
        </div>
        <div>
          <label className="label">مبلغ پرداختی (ریال)</label>
          <input
            type="number"
            className="input text-center"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(+e.target.value)}
          />
        </div>
        <div>
          <label className="label">روش پرداخت</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">نقدی</option>
            <option value="CARD">کارت‌خوان</option>
            <option value="TRANSFER">کارت‌به‌کارت / واریز</option>
          </select>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          انصراف
        </button>
        <button className="btn-primary" onClick={submit} disabled={loading || amount <= 0}>
          {loading ? 'در حال ثبت…' : 'ثبت پرداخت'}
        </button>
      </div>
    </Modal>
  );
}
