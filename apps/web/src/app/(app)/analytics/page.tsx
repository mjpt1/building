'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Send } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { PageHeader, EmptyState } from '@/components/ui';

export default function AnalyticsPage() {
  const { buildingId } = useAuth();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<{ q: string; a: string; ok: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: suggestions } = useQuery({
    queryKey: ['analytics-suggestions', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/analytics/suggestions`)).data,
    enabled: !!buildingId,
  });

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/buildings/${buildingId}/analytics/ask`, { question: q });
      const d = res.data.data;
      setHistory((h) => [{ q, a: d.answer, ok: d.understood }, ...h]);
    } catch (e) {
      setHistory((h) => [{ q, a: apiError(e), ok: false }, ...h]);
    } finally {
      setLoading(false);
      setQuestion('');
    }
  }

  return (
    <div>
      <PageHeader title="تحلیل هوشمند" subtitle="پرسش‌های مدیریتی خود را به زبان فارسی بپرسید؛ پاسخ بر اساس داده‌ی واقعی است." />

      <div className="card mb-4">
        <div className="flex gap-2">
          <input className="input" placeholder="مثلاً: موجودی صندوق الان چقدر است؟"
            value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(question)} />
          <button className="btn-primary" onClick={() => ask(question)} disabled={loading}>
            <Send size={16} /> {loading ? 'در حال تحلیل…' : 'پرسش'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions?.map((s: string, i: number) => (
            <button key={i} onClick={() => ask(s)}
              className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100">{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {history.map((h, i) => (
          <div key={i} className="card">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <span className="text-brand-600">شما:</span> {h.q}
            </div>
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${h.ok ? 'bg-brand-50 text-gray-700' : 'bg-warning-light text-warning-dark'}`}>
              <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
              <span>{h.a}</span>
            </div>
          </div>
        ))}
        {history.length === 0 && <EmptyState icon={<Sparkles size={32} />} text="هنوز پرسشی نپرسیده‌اید. از پیشنهادهای بالا شروع کنید." />}
      </div>
    </div>
  );
}
