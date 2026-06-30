'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge } from '@/components/ui';

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  SUBMITTED: [{ value: 'REVIEWING', label: 'بررسی' }, { value: 'APPROVED', label: 'تایید' }, { value: 'CANCELED', label: 'لغو' }],
  REVIEWING: [{ value: 'APPROVED', label: 'تایید' }, { value: 'CANCELED', label: 'لغو' }],
  APPROVED: [{ value: 'IN_PROGRESS', label: 'شروع کار' }, { value: 'CANCELED', label: 'لغو' }],
  IN_PROGRESS: [{ value: 'DONE', label: 'اتمام کار' }, { value: 'CANCELED', label: 'لغو' }],
  DONE: [], CANCELED: [],
};

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPerm } = useAuth();
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['maint-detail', id],
    queryFn: async () => (await fetchData(`/maintenance/${id}`)).data,
  });

  async function changeStatus(status: string) {
    setError('');
    try {
      await api.patch(`/maintenance/${id}/status`, { status });
      qc.invalidateQueries({ queryKey: ['maint-detail', id] });
    } catch (e) { setError(apiError(e)); }
  }
  async function addComment() {
    if (!comment.trim()) return;
    await api.post(`/maintenance/${id}/comments`, { body: comment });
    setComment('');
    qc.invalidateQueries({ queryKey: ['maint-detail', id] });
  }

  if (isLoading) return <Loading />;
  if (!data) return <EmptyState />;

  return (
    <div>
      <PageHeader title={data.title} subtitle={`کد پیگیری: ${data.trackingNo}`} action={<StatusBadge status={data.status} />} />
      {error && <div className="mb-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="text-sm text-gray-600">{data.description ?? 'بدون توضیحات'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-400">دسته</dt><dd>{data.category ?? '—'}</dd></div>
            <div><dt className="text-gray-400">اولویت</dt><dd><StatusBadge status={data.priority} /></dd></div>
            <div><dt className="text-gray-400">ثبت‌کننده</dt><dd>{data.resident?.fullName ?? data.requester?.fullName ?? '—'}</dd></div>
            <div><dt className="text-gray-400">هزینه</dt><dd>{data.cost ? formatRial(data.cost) : '—'}</dd></div>
          </dl>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h4 className="mb-3 text-sm font-bold text-gray-700">تاریخچه و یادداشت‌ها</h4>
            <div className="space-y-3">
              {data.comments.map((c: any) => (
                <div key={c.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>{c.author}</span><span>{c.createdAt?.jalali}</span>
                  </div>
                  {c.body}
                  {c.statusTo && <span className="mr-2"><StatusBadge status={c.statusTo} /></span>}
                </div>
              ))}
              {data.comments.length === 0 && <p className="text-sm text-gray-400">یادداشتی ثبت نشده.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input" placeholder="افزودن یادداشت…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn-ghost" onClick={addComment}>ارسال</button>
            </div>
          </div>
        </div>

        <div className="card h-fit">
          <h4 className="mb-3 text-sm font-bold text-gray-700">تغییر وضعیت</h4>
          {hasPerm('maintenance:update') ? (
            <div className="space-y-2">
              {(NEXT_STATUS[data.status] ?? []).map((s) => (
                <button key={s.value} onClick={() => changeStatus(s.value)} className="btn-ghost w-full justify-start">{s.label}</button>
              ))}
              {(NEXT_STATUS[data.status] ?? []).length === 0 && <p className="text-sm text-gray-400">این درخواست بسته شده است.</p>}
            </div>
          ) : <p className="text-sm text-gray-400">دسترسی تغییر وضعیت ندارید.</p>}
        </div>
      </div>
    </div>
  );
}
