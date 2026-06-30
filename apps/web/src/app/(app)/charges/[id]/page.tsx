'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge } from '@/components/ui';
import { useState } from 'react';

export default function ChargePeriodPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPerm } = useAuth();
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['period', id],
    queryFn: async () => (await fetchData(`/charge-periods/${id}`)).data,
  });

  async function approve() {
    try {
      await api.post(`/charge-periods/${id}/approve`);
      qc.invalidateQueries({ queryKey: ['period', id] });
      setMsg('دوره تایید و به ساکنین ابلاغ شد.');
    } catch (e) { setMsg(apiError(e)); }
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
            <button className="btn-primary" onClick={approve}>تایید و ابلاغ</button>
          ) : <StatusBadge status={data.status} />
        }
      />
      {msg && <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{msg}</div>}

      <div className="table-wrap">
        <table className="w-full">
          <thead><tr>
            <th className="th">واحد</th><th className="th">مبلغ شارژ</th><th className="th">جریمه</th>
            <th className="th">پرداختی</th><th className="th">وضعیت</th><th className="th">ریز محاسبه</th>
          </tr></thead>
          <tbody>
            {data.charges.map((c: any) => (
              <tr key={c.id}>
                <td className="td font-medium">واحد {c.unitCode}</td>
                <td className="td">{formatRial(c.amount)}</td>
                <td className="td">{formatRial(c.penaltyAmount)}</td>
                <td className="td">{formatRial(c.paidAmount)}</td>
                <td className="td"><StatusBadge status={c.status} /></td>
                <td className="td text-xs text-gray-400">
                  {(c.breakdown ?? []).map((b: any) => `${b.title}: ${formatRial(b.amount)}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
