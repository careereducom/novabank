import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const PRESETS = [
  { label: 'Last 30 days',  months: 1 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last 1 year',   months: 12 },
  { label: 'Last 5 years',  months: 60 },
  { label: 'Last 10 years', months: 120 },
  { label: 'Full history',  months: null },
];

function monthsAgoIso(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function Statement() {
  const { token, accounts } = useAuth();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [from, setFrom] = useState(monthsAgoIso(12));
  const [to, setTo]     = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stamp = iso => new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, type });
      const res = await apiFetch(`/statements/${accountId}?${params}`, {}, token);
      setData(res);
      setPage(1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [accountId]);

  const applyPreset = (p) => {
    if (p.months === null) setFrom('2010-01-01');
    else setFrom(monthsAgoIso(p.months));
  };

  const downloadPdf = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/statements/${accountId}/pdf?from=${from}&to=${to}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `statement-${accountId}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = data ? Math.ceil(data.transactions.length / perPage) : 0;
  const slice = data ? data.transactions.slice((page - 1) * perPage, page * perPage) : [];

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#0f2b5b]">Account Statement</h1>
          <p className="text-gray-500 text-sm mt-1">Full transaction history — 15 years on record</p>
        </div>
        <button onClick={downloadPdf} className="btn-primary text-sm py-2.5">
          ⬇ Download PDF
        </button>
      </div>

      <div className="card p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="field text-sm py-2.5">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {money(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="field text-sm py-2.5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="field text-sm py-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Quick range</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md transition">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Transaction Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="field text-sm py-2.5">
              <option value="ALL">All types</option>
              <option value="SALARY">Salary</option>
              <option value="TRANSFER">Transfer</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="BILL">Bill Payment</option>
              <option value="DIVIDEND">Dividend</option>
              <option value="CORPORATE">Corporate Wire</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={loading}
              className="btn-primary w-full text-sm py-2.5 disabled:opacity-50">
              {loading ? 'Loading…' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Transactions</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{data.summary.count.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Money In</p>
            <p className="text-xl font-bold text-green-700 mt-1">{money(data.summary.totalIn)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-700 font-bold uppercase tracking-wider">Money Out</p>
            <p className="text-xl font-bold text-red-700 mt-1">{money(data.summary.totalOut)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Net Flow</p>
            <p className={`text-xl font-bold mt-1 ${data.summary.net >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {money(data.summary.net)}
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((t, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{stamp(t.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{t.description || t.type}</p>
                      <p className="text-xs text-gray-400">{t.type}{t.category ? ' · ' + t.category : ''}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.reference}</td>
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.direction === 'IN' ? '+' : '−'}{money(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                      {money(t.balanceAfter)}
                    </td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No transactions in this range.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {data.transactions.length.toLocaleString()} records
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-semibold disabled:opacity-40">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-semibold disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
