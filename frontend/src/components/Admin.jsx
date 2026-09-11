import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState('credentials');
  const [txns, setTxns] = useState([]);
  const [deps, setDeps] = useState([]);
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [toast, setToast] = useState('');

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stamp = iso => new Date(iso).toLocaleString('en-US');

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [t, d, c] = await Promise.all([
        apiFetch('/admin/pending', {}, token),
        apiFetch('/admin/deposits/pending', {}, token),
        apiFetch('/admin/credentials', {}, token)
      ]);
      setTxns(t); setDeps(d); setCreds(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const act = async (path) => {
    try {
      await apiFetch(path, { method: 'POST' }, token);
      load();
      flash('✓ Done');
    } catch (e) { flash('✗ ' + e.message); }
  };

  const copyAll = () => {
    const text = creds.map(c =>
      `${c.accountName}\n  Username : ${c.username}\n  Password : ${c.password}\n  Code     : ${c.transferCode}\n  Balance  : ${money(c.balance)}\n`
    ).join('\n');
    navigator.clipboard.writeText(text);
    flash('✓ Credentials copied');
  };

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#0f2b5b]">Operations Console</h1>
          <p className="text-gray-500 text-sm mt-1">Institutional controls and client registry</p>
        </div>
        {toast && (
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {toast}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('credentials')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'credentials' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          🔐 Client Registry
        </button>
        <button onClick={() => setTab('transfers')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'transfers' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Pending Transfers ({txns.length})
        </button>
        <button onClick={() => setTab('deposits')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'deposits' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Pending Deposits ({deps.length})
        </button>
      </div>

      {!loading && tab === 'credentials' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="max-w-2xl">
                <p className="font-bold text-blue-900 mb-1">🔐 Client Registry — Internal</p>
                <p className="text-sm text-blue-800">
                  Credentials for all registered account holders. Access restricted to authorized
                  operations staff. Transfer codes are required for all outbound payments and
                  remain confidential to the account holder.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReveal(!reveal)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition">
                  {reveal ? '🙈 Mask Codes' : '👁 View Codes'}
                </button>
                <button onClick={copyAll}
                  className="bg-white hover:bg-gray-50 border border-blue-300 text-blue-900 px-4 py-2 rounded-md font-semibold text-sm transition">
                  📋 Export
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creds.map(c => (
              <div key={c.accountNumber} className="card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{c.accountName}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.accountNumber}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{money(c.balance)}</p>
                </div>

                <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Username</span>
                    <span className="font-mono font-semibold text-gray-800">{c.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Password</span>
                    <span className="font-mono font-semibold text-gray-800">{c.password}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Transfer Code</span>
                    <span className="font-mono font-bold tracking-widest text-[#b1122b]">
                      {reveal ? c.transferCode : '••••'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'transfers' && (
        <div className="space-y-3">
          {txns.length === 0 && <p className="card p-8 text-center text-gray-500">No pending transfers</p>}
          {txns.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">
                    {t.fromAccount.accountName} → {t.toAccount?.accountName || 'External Beneficiary'}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{t.reference} · {stamp(t.createdAt)}</p>
                  <p className="text-xs text-gray-500 font-mono">To: {t.toAccount?.accountNumber || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-2">{t.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{money(t.amount)}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => act(`/admin/transfers/${t.id}/approve`)}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md text-sm">
                      Approve
                    </button>
                    <button onClick={() => act(`/admin/transfers/${t.id}/reject`)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md text-sm">
                      Reject &amp; Refund
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'deposits' && (
        <div className="space-y-3">
          {deps.length === 0 && <p className="card p-8 text-center text-gray-500">No pending check deposits</p>}
          {deps.map(d => (
            <div key={d.id} className="card p-5 flex flex-wrap gap-4">
              <img src={d.checkImage} alt="Check" className="w-40 h-28 object-cover rounded-lg border border-gray-200" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-lg">{money(d.amount)}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{d.reference} · {stamp(d.createdAt)}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => act(`/admin/deposits/${d.id}/approve`)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md text-sm">
                  Approve
                </button>
                <button onClick={() => act(`/admin/deposits/${d.id}/reject`)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md text-sm">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
