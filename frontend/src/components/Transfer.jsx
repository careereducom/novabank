import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import Receipt from './Receipt';

export default function Transfer() {
  const { accounts, token, refreshAccounts } = useAuth();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [enquiry, setEnquiry] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const sender = accounts.find(a => a.id === fromAccountId);
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  useEffect(() => {
    if (toAccountNumber.length !== 10) { setEnquiry(null); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const data = await apiFetch(`/accounts/resolve/${toAccountNumber}`, {}, token);
        if (!cancel) setEnquiry(data);
      } catch {
        if (!cancel) setEnquiry({ resolved: false, message: 'Unable to resolve account' });
      }
    }, 400);
    return () => { cancel = true; clearTimeout(t); };
  }, [toAccountNumber, token]);

  const initiate = () => {
    setError('');
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount');
    if (Number(amount) > Number(sender.balance)) {
      return setError(`Insufficient funds. Balance: ${money(sender.balance)}`);
    }
    setShowPinModal(true);
  };

  const confirm = async () => {
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId,
          toAccountNumber,
          amount: Number(amount),
          transferCode
        })
      }, token);
      setShowPinModal(false);
      setReceipt(data.receipt);
      setTransferCode('');
      const fresh = await apiFetch('/accounts', {}, token);
      refreshAccounts(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setToAccountNumber('');
    setAmount('');
    setEnquiry(null);
    setReceipt(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-6">Transfer Funds</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            From Account
          </label>
          <select
            value={fromAccountId}
            onChange={e => setFromAccountId(e.target.value)}
            className="field">
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.accountNumber} — {money(a.balance)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Recipient Account Number
          </label>
          <input
            type="text"
            maxLength={10}
            value={toAccountNumber}
            onChange={e => setToAccountNumber(e.target.value.replace(/\D/g, ''))}
            className="field font-mono"
            placeholder="Enter 10-digit account number"
          />
          {enquiry && enquiry.resolved && (
            <div className="mt-2 px-4 py-3 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm font-bold text-green-800">✓ {enquiry.accountName}</p>
              <p className="text-xs text-green-700 mt-0.5">{enquiry.bankName}</p>
              <p className="text-xs text-green-600 font-mono mt-0.5">{enquiry.accountNumber}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="field"
            placeholder="0.00"
          />
        </div>

        {error && !showPinModal && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <button onClick={initiate} className="btn-primary w-full">
          Send Money
        </button>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-1">Enter Transfer Code</h3>
            <p className="text-sm text-gray-500 mb-5">
              Confirm this transfer with your 4-digit code
            </p>

            <div className="text-center font-serif text-3xl font-bold text-[#0f2b5b] mb-2">
              {money(amount)}
            </div>
            {enquiry && enquiry.resolved && (
              <div className="text-center text-xs text-gray-500 mb-5">
                To <strong>{enquiry.accountName}</strong><br/>
                <span className="text-gray-400">{enquiry.bankName}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <input
              type="password"
              maxLength={4}
              value={transferCode}
              onChange={e => setTransferCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-[1em] font-mono px-4 py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0f2b5b] focus:border-transparent outline-none"
              placeholder="••••"
              autoFocus
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowPinModal(false); setTransferCode(''); setError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition">
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={loading || transferCode.length !== 4}
                className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && <Receipt receipt={receipt} onClose={clearForm} />}
    </div>
  );
}