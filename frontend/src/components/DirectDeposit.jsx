import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function DirectDeposit() {
  const { token, accounts } = useAuth();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!accountId) return;
    apiFetch(`/direct-deposit/${accountId}`, {}, token).then(setInfo).catch(() => {});
  }, [accountId, token]);

  const copy = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const download = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/direct-deposit/${accountId}/slip.pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `direct-deposit-${info.accountNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!info) return <p className="text-gray-500">Loading…</p>;

  const rows = [
    { label:'Financial Institution', key:'bankName',      value: info.bankName },
    { label:'Routing (ABA) Number',  key:'routing',       value: info.routingNumber, mono:true, copy:true },
    { label:'Account Number',        key:'accountNumber', value: info.accountNumber, mono:true, copy:true },
    { label:'Account Type',          key:'accountType',   value: info.accountType },
    { label:'Account Holder',        key:'accountName',   value: info.accountName },
    { label:'Bank Address',          key:'bankAddress',   value: info.bankAddress },
    { label:'SWIFT / BIC',           key:'swift',         value: info.swift, mono:true, copy:true },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0f2b5b]">Direct Deposit</h1>
        <p className="text-gray-500 text-sm mt-1">Set up payroll deposits to your Continental Federal account</p>
      </div>

      <div className="card p-5 mb-6">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
          Deposit To
        </label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="field">
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName}</option>
          ))}
        </select>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg text-[#0f2b5b] mb-4">
          Give these details to your employer
        </h2>

        {rows.map(r => (
          <div key={r.key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-500">{r.label}</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold text-gray-800 ${r.mono ? 'font-mono' : ''}`}>
                {r.value}
              </span>
              {r.copy && (
                <button onClick={() => copy(r.key, r.value)}
                  className="text-xs text-[#0f2b5b] font-semibold hover:underline min-w-[50px] text-right">
                  {copied === r.key ? '✓ Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ))}

        <button onClick={download} className="btn-primary w-full mt-6">
          ⬇ Download Deposit Slip (PDF)
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-serif text-lg text-[#0f2b5b] mb-4">How it works</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          {info.instructions.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-[#c9a227] font-bold">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-500">
          Need help? Call <strong>{info.supportPhone}</strong> or email{' '}
          <a href="mailto:support@cfbank.com" className="text-[#0f2b5b] underline">support@cfbank.com</a>
        </div>
      </div>
    </div>
  );
}
