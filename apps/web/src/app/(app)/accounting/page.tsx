'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet } from 'lucide-react';
import { api, fetchData, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial } from '@/lib/format';
import { todayJalali } from '@/lib/jalali';
import { JalaliDateInput } from '@/components/JalaliDateInput';
import { PageHeader, Loading, EmptyState, StatCard, Modal } from '@/components/ui';

export default function AccountingPage() {
  const { buildingId, hasPerm } = useAuth();
  const [tab, setTab] = useState<'incomes' | 'expenses' | 'ledger'>('incomes');
  const [modal, setModal] = useState<'income' | 'expense' | 'cashbox' | null>(null);

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;

  return (
    <div>
      <PageHeader title="حسابداری" subtitle="درآمد، هزینه، صندوق و دفتر کل" />
      <Balance buildingId={buildingId} onNewCashbox={() => setModal('cashbox')} canManage={hasPerm('cashbox:manage')} />

      <div className="my-4 flex flex-wrap items-center gap-2">
        <TabBtn active={tab === 'incomes'} onClick={() => setTab('incomes')}>درآمدها</TabBtn>
        <TabBtn active={tab === 'expenses'} onClick={() => setTab('expenses')}>هزینه‌ها</TabBtn>
        <TabBtn active={tab === 'ledger'} onClick={() => setTab('ledger')}>دفتر کل</TabBtn>
        <div className="flex-1" />
        {hasPerm('income:create') && <button className="btn-ghost" onClick={() => setModal('income')}><Plus size={15} /> درآمد</button>}
        {hasPerm('expense:create') && <button className="btn-primary" onClick={() => setModal('expense')}><Plus size={15} /> هزینه</button>}
      </div>

      {tab === 'incomes' && <List buildingId={buildingId} url="incomes" cols={['عنوان', 'منبع', 'صندوق', 'مبلغ', 'تاریخ']} keys={['title', 'source', 'cashbox', 'amount', 'receivedAt']} />}
      {tab === 'expenses' && <List buildingId={buildingId} url="expenses" cols={['عنوان', 'دسته', 'صندوق', 'مبلغ', 'تاریخ']} keys={['title', 'category', 'cashbox', 'amount', 'spentAt']} />}
      {tab === 'ledger' && <List buildingId={buildingId} url="ledger" cols={['شرح', 'نوع', 'مبلغ', 'مانده', 'تاریخ']} keys={['description', 'type', 'amount', 'balanceAfter', 'occurredAt']} />}

      {(modal === 'income' || modal === 'expense') && (
        <EntryModal kind={modal} buildingId={buildingId} onClose={() => setModal(null)} />
      )}
      {modal === 'cashbox' && <CashboxModal buildingId={buildingId} onClose={() => setModal(null)} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{children}</button>;
}

function Balance({ buildingId, onNewCashbox, canManage }: { buildingId: string; onNewCashbox: () => void; canManage: boolean }) {
  const { data } = useQuery({
    queryKey: ['balance', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/cashbox-balance`)).data,
  });
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="موجودی کل صندوق‌ها" value={formatRial(data?.total ?? 0)} icon={<Wallet size={20} />} tone="brand" />
        {data?.boxes?.slice(0, 2).map((b: any) => (
          <StatCard key={b.id} title={b.name} value={formatRial(b.balance)} tone="success" />
        ))}
      </div>
      {canManage && (
        <button className="btn-ghost mt-3" onClick={onNewCashbox}><Plus size={15} /> صندوق جدید</button>
      )}
    </div>
  );
}

function List({ buildingId, url, cols, keys }: { buildingId: string; url: string; cols: string[]; keys: string[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ['acc', url, buildingId],
    queryFn: async () => await fetchData(`/buildings/${buildingId}/${url}`, { limit: 50 }),
  });
  if (isLoading) return <Loading />;
  const rows = data?.data ?? [];
  if (!rows.length) return <EmptyState text="موردی ثبت نشده است." />;

  return (
    <div>
      {data?.meta?.totalAmount !== undefined && (
        <div className="mb-3 text-sm text-gray-500">جمع کل: <span className="font-bold text-gray-800">{formatRial(data.meta.totalAmount)}</span></div>
      )}
      <div className="table-wrap">
        <table className="w-full">
          <thead><tr>{cols.map((c) => <th key={c} className="th">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k} className="td">
                    {k === 'amount' || k === 'balanceAfter' ? formatRial(r[k])
                      : k === 'type' ? (r[k] === 'CREDIT' ? <span className="text-success">واریز</span> : <span className="text-danger">برداشت</span>)
                      : typeof r[k] === 'object' && r[k] ? r[k]?.jalali ?? '—'
                      : r[k] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntryModal({ kind, buildingId, onClose }: { kind: 'income' | 'expense'; buildingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const isIncome = kind === 'income';
  const [form, setForm] = useState({ title: '', amount: 0, date: todayJalali(), vendor: '', source: '', cashboxId: '', categoryId: '' });
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cashboxes } = useQuery({
    queryKey: ['cashboxes', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/cashboxes`)).data,
  });
  const { data: categories } = useQuery({
    queryKey: ['categories', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/expense-categories`)).data,
    enabled: !isIncome,
  });

  async function addCategory() {
    if (!newCat.trim()) return;
    const res = await api.post(`/buildings/${buildingId}/expense-categories`, { title: newCat });
    setNewCat('');
    qc.invalidateQueries({ queryKey: ['categories', buildingId] });
    setForm({ ...form, categoryId: res.data.data.id });
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const body: any = isIncome
        ? { title: form.title, amount: Number(form.amount), receivedAt: form.date, source: form.source || undefined, cashboxId: form.cashboxId || undefined }
        : { title: form.title, amount: Number(form.amount), spentAt: form.date, vendor: form.vendor || undefined, cashboxId: form.cashboxId || undefined, categoryId: form.categoryId || undefined };
      await api.post(`/buildings/${buildingId}/${isIncome ? 'incomes' : 'expenses'}`, body);
      qc.invalidateQueries();
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isIncome ? 'ثبت درآمد' : 'ثبت هزینه'}>
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">عنوان *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">مبلغ (ریال)</label><input className="input text-center" dir="ltr" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
        {isIncome
          ? <div><label className="label">منبع</label><input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="مثلاً اجاره مشاعات" /></div>
          : <div><label className="label">طرف حساب/پیمانکار</label><input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>}

        {!isIncome && (
          <div>
            <label className="label">دسته‌بندی هزینه</label>
            <div className="flex gap-2">
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— بدون دسته —</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input className="input" placeholder="دسته‌ی جدید…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <button type="button" className="btn-ghost whitespace-nowrap" onClick={addCategory}>افزودن دسته</button>
            </div>
          </div>
        )}

        <div>
          <label className="label">صندوق</label>
          <select className="input" value={form.cashboxId} onChange={(e) => setForm({ ...form, cashboxId: e.target.value })}>
            <option value="">— صندوق پیش‌فرض —</option>
            {cashboxes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div><label className="label">تاریخ</label><JalaliDateInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>ثبت</button>
      </div>
    </Modal>
  );
}

function CashboxModal({ buildingId, onClose }: { buildingId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'BANK', accountNumber: '', iban: '', initialBalance: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await api.post(`/buildings/${buildingId}/cashboxes`, {
        name: form.name,
        type: form.type,
        accountNumber: form.accountNumber || undefined,
        iban: form.iban || undefined,
        initialBalance: Number(form.initialBalance),
      });
      qc.invalidateQueries({ queryKey: ['balance', buildingId] });
      qc.invalidateQueries({ queryKey: ['cashboxes', buildingId] });
      onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="صندوق / حساب جدید">
      {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger-dark">{error}</div>}
      <div className="space-y-3">
        <div><label className="label">نام صندوق *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <label className="label">نوع</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="BANK">حساب بانکی</option>
            <option value="CASH">صندوق نقدی</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">شماره حساب</label><input className="input" dir="ltr" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
          <div><label className="label">موجودی اولیه</label><input className="input text-center" dir="ltr" type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: +e.target.value })} /></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>انصراف</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>ثبت</button>
      </div>
    </Modal>
  );
}
