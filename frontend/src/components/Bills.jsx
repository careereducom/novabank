import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Bills() {
  const { token, accounts, refreshAccounts } = useAuth();
  const [billers, setBillers] = useState([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [biller, setBiller] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/bills/billers', {}, token).then(setBillers).catch(() => {});
  }, [token]);

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk(null); setLoading(true);
    try {
      const res = await apiFetch('/bills/pay', {
        method: 'POST',
        body: JSON.stringify({ accountId, biller, customerId, amount: Number(amount), transferCode: code })
      }, token);
      setOk(res.payment);
      setCustomerId(''); setAmount(''); setCode('');
      const fresh = await apiFetch('/accounts', {}, token);
      refreshAccounts(fresh);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-6">Pay Bills</h1>
      <form onSubmit={submit} className="card p-6 space-y-5">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{err}</div>}
        {ok && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            ✓ Payment successful — Ref: {ok.reference}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">From Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="field">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {money(a.balance)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Biller</label>
          <select value={biller} onChange={e => setBiller(e.target.value)} required className="field">
            <option value="">Select biller</option>
            {billers.map(b => <option key={b.id} value={b.name}>{b.name} — {b.category}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Customer / Account Number</label>
          <input value={customerId} onChange={e => setCustomerId(e.target.value)} required
            className="field font-mono" placeholder="e.g. 5551234567" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Amount (USD)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required
            className="field" placeholder="0.00" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Transfer Code</label>
          <input type="password" maxLength={4} value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required
            className="field font-mono tracking-widest text-center" placeholder="••••" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Processing…' : 'Pay Bill'}
        </button>
      </form>
    </div>
  );
}
