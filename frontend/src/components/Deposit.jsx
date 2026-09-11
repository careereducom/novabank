import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Deposit() {
  const { token, accounts } = useAuth();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErr('Please select an image');
    if (file.size > 6_000_000) return setErr('Image too large (max ~6MB)');
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result); setPreview(reader.result); setErr(''); };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk(null);
    if (!image) return setErr('Upload a check image');
    setLoading(true);
    try {
      const res = await apiFetch('/deposits', {
        method: 'POST',
        body: JSON.stringify({ accountId, amount: Number(amount), checkImage: image })
      }, token);
      setOk(res.deposit);
      setAmount(''); setImage(null); setPreview(null);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-6">Mobile Check Deposit</h1>
      <form onSubmit={submit} className="card p-6 space-y-5">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{err}</div>}
        {ok && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
            ⏳ Check submitted (Ref: {ok.reference}). Funds available after review.
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Deposit To</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="field">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {money(a.balance)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Check Amount (USD)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required
            className="field" placeholder="0.00" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Check Photo (Front)</label>
          <input type="file" accept="image/*" onChange={onFile} required
            className="w-full px-4 py-3 border border-dashed border-gray-300 rounded-md bg-gray-50 cursor-pointer" />
          {preview && (
            <img src={preview} alt="Check preview" className="mt-3 rounded-lg max-h-56 w-full object-contain border border-gray-200" />
          )}
        </div>

        <button type="submit" disabled={loading || !image} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit Deposit'}
        </button>
      </form>
    </div>
  );
}
