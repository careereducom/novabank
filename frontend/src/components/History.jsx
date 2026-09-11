import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function History() {
  const { token } = useAuth();
  const [txns, setTxns] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiFetch('/transfers/history', {}, token).then(setTxns).catch(() => {});
  }, [token]);

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stamp = iso => new Date(iso).toLocaleString('en-US');

  const filtered = filter === 'all' ? txns : txns.filter(t => t.status === filter);

  const badge = (s) => {
    const colors = {
      SUCCESS: 'bg-green-100 text-green-700',
      PENDING: 'bg-amber-100 text-amber-700',
      REJECTED: 'bg-red-100 text-red-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    const label = s === 'PENDING' ? 'PROCESSING' : s;
    return `px-2.5 py-1 rounded-full text-xs font-bold ${colors[s] || 'bg-gray-100 text-gray-700'}`;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-6">Transaction History</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'SUCCESS', 'PENDING', 'REJECTED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition ${
              filter === f ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-[#0f2b5b]'
            }`}>
            {f === 'all' ? 'All' : f === 'PENDING' ? 'Processing' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="card p-8 text-center text-gray-500">No transactions.</p>
      )}

      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="card p-5 flex justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800">{t.description || t.type}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {t.reference} · {stamp(t.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{money(t.amount)}</p>
              <span className={badge(t.status)}>{t.status === 'PENDING' ? 'PROCESSING' : t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
