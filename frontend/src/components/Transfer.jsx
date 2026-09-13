import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import Receipt from './Receipt';

const ROUTING_PRESETS = [
  { value: '', label: 'Select beneficiary bank' },
  { value: '021407912', label: 'Continental Federal Bank & Trust (internal)' },
  { value: '021000021', label: 'JPMorgan Chase Bank, New York, NY' },
  { value: '026009593', label: 'Bank of America, Charlotte, NC' },
  { value: '121000248', label: 'Wells Fargo Bank, San Francisco, CA' },
  { value: '021001088', label: 'Citibank, New York, NY' },
  { value: '031000503', label: 'PNC Bank, Pittsburgh, PA' },
  { value: '051000017', label: 'Capital One, McLean, VA' },
  { value: '091000019', label: 'U.S. Bank, Minneapolis, MN' },
  { value: '124003116', label: 'KeyBank, Cleveland, OH' },
  { value: '256074974', label: 'Navy Federal Credit Union, Vienna, VA' },
  { value: '042000013', label: 'Fifth Third Bank, Cincinnati, OH' },
  { value: '062000019', label: 'Regions Bank, Birmingham, AL' },
];

export default function Transfer() {
  const { accounts, token, refreshAccounts } = useAuth();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [toRoutingNumber, setToRoutingNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [enquiry, setEnquiry] = useState(null);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [otpDestination, setOtpDestination] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const otpRefs = useRef([]);

  const sender = accounts.find(a => a.id === fromAccountId);
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const stamp = iso => new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  useEffect(() => {
    if (toAccountNumber.length !== 10) { setEnquiry(null); return; }
    let cancel = false;
    setEnquiryLoading(true);
    const t = setTimeout(async () => {
      try {
        const qs = toRoutingNumber ? `?routing=${toRoutingNumber}` : '';
        const data = await apiFetch(`/accounts/resolve/${toAccountNumber}${qs}`, {}, token);
        if (!cancel) setEnquiry(data);
      } catch {
        if (!cancel) setEnquiry({ resolved: false, error: 'Unable to reach inter-bank network' });
      } finally {
        if (!cancel) setEnquiryLoading(false);
      }
    }, 400);
    return () => { cancel = true; clearTimeout(t); };
  }, [toAccountNumber, toRoutingNumber, token]);

  const initiate = () => {
    setError('');
    if (!toRoutingNumber) return setError('Select a beneficiary bank.');
    if (!enquiry?.resolved) return setError('Recipient account could not be verified.');
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount.');
    if (Number(amount) > Number(sender.balance)) {
      return setError(`Insufficient funds. Balance: ${money(sender.balance)}`);
    }
    setShowPinModal(true);
  };

  const submitPin = async () => {
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/transfers/initiate', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId,
          toAccountNumber,
          toRoutingNumber,
          amount: Number(amount),
          transferCode,
        }),
      }, token);

      setPendingId(data.pendingId);
      setOtpDestination(data.destination || '');
      setTransferCode('');
      setShowPinModal(false);
      setShowOtpModal(true);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const confirmOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setOtpError('Enter the 6-digit code');
    setOtpError(''); setOtpLoading(true);
    try {
      const data = await apiFetch('/transfers/confirm', {
        method: 'POST',
        body: JSON.stringify({ pendingId, otp: code }),
      }, token);
      setShowOtpModal(false);
      setReceipt(data.receipt);
      const fresh = await apiFetch('/accounts', {}, token);
      refreshAccounts(fresh);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const clearForm = () => {
    setToAccountNumber('');
    setToRoutingNumber('');
    setAmount('');
    setEnquiry(null);
    setReceipt(null);
    setPendingId('');
    setOtpDestination('');
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-6">Transfer Funds</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            From Account
          </label>
          <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="field">
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.accountNumber} — {money(a.balance)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Recipient Bank
          </label>
          <select value={toRoutingNumber} onChange={e => setToRoutingNumber(e.target.value)} className="field">
            {ROUTING_PRESETS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Recipient Account Number
          </label>
          <input type="text" maxLength={10} value={toAccountNumber}
            onChange={e => setToAccountNumber(e.target.value.replace(/\D/g, ''))}
            className="field font-mono tracking-widest"
            placeholder="Enter 10-digit account number" />
        </div>

        {enquiryLoading && toAccountNumber.length === 10 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm font-bold text-blue-900">Verifying with inter-bank network…</p>
              <p className="text-xs text-blue-700 mt-0.5">Contacting beneficiary bank for name verification</p>
            </div>
          </div>
        )}

        {enquiry && enquiry.resolved && !enquiryLoading && (
          <div className="border-2 border-green-200 bg-green-50 rounded-lg overflow-hidden">
            <div className="bg-green-100 px-4 py-2 flex items-center justify-between border-b border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white grid place-items-center text-xs font-bold">✓</span>
                <span className="text-xs font-bold text-green-900 uppercase tracking-wider">Recipient Verified</span>
              </div>
              <span className="text-[10px] text-green-700 font-mono">
                {enquiry.retrievedAt ? stamp(enquiry.retrievedAt) : ''}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Name on File</p>
                <p className="font-serif text-xl font-bold text-[#0f2b5b] mt-0.5">{enquiry.accountName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Account</p>
                  <p className="font-mono text-sm text-gray-800 mt-0.5">{enquiry.accountNumberMasked || enquiry.accountNumber}</p>
                </div>
                {enquiry.routingNumber && (
                  <div>
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Routing</p>
                    <p className="font-mono text-sm text-gray-800 mt-0.5">{enquiry.routingNumber}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Financial Institution</p>
                <p className="text-sm text-gray-800 mt-0.5 font-semibold">{enquiry.bankName}</p>
                {enquiry.swift && <p className="text-[10px] text-gray-500 font-mono mt-0.5">SWIFT/BIC: {enquiry.swift}</p>}
              </div>

              {enquiry.network && (
                <div className="border-t border-green-200 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Settlement Network</p>
                      <p className="text-gray-800 mt-0.5 font-semibold">{enquiry.network.network}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Expected Settlement</p>
                      <p className="text-gray-800 mt-0.5 font-semibold">{enquiry.network.settlementTime}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-green-800 bg-white border border-green-200 rounded-md px-3 py-2 mt-3">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>
                  <strong>Name match:</strong> {enquiry.nameMatchConfidence || 'CONFIRMED'}
                  {enquiry.nameMatchConfidence === 'EXACT' && ' — verified against CFB internal ledger'}
                  {enquiry.nameMatchConfidence === 'LIKELY' && ' — returned by beneficiary bank via inter-bank network'}
                </span>
              </div>
            </div>
          </div>
        )}

        {enquiry && !enquiry.resolved && !enquiryLoading && toAccountNumber.length === 10 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-bold text-red-800">Could not verify recipient</p>
            <p className="text-xs text-red-700 mt-1">
              {enquiry.error || 'The account number could not be resolved by the inter-bank network.'}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Amount (USD)
          </label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="field font-serif text-lg" placeholder="0.00" />
        </div>

        {error && !showPinModal && !showOtpModal && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <button onClick={initiate} className="btn-primary w-full">
          Continue to PIN →
        </button>
      </div>

      {/* PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-1">Step 1 of 2 — Transfer Code</h3>
            <p className="text-sm text-gray-500 mb-5">Enter your 4-digit PIN to continue</p>

            <div className="text-center font-serif text-3xl font-bold text-[#0f2b5b] mb-3">{money(amount)}</div>

            {enquiry && enquiry.resolved && (
              <div className="text-center text-xs text-gray-500 mb-5 bg-green-50 border border-green-200 rounded-md py-2 px-3">
                <p className="font-bold text-green-800">✓ {enquiry.accountName}</p>
                <p className="text-gray-600 mt-0.5">{enquiry.bankName}</p>
                <p className="text-gray-500 font-mono text-[10px] mt-0.5">
                  {enquiry.accountNumberMasked} · Routing {enquiry.routingNumber}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{error}</div>
            )}

            <input type="password" maxLength={4} value={transferCode}
              onChange={e => setTransferCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-[1em] font-mono px-4 py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0f2b5b] outline-none"
              placeholder="••••" autoFocus />

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowPinModal(false); setTransferCode(''); setError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition">
                Cancel
              </button>
              <button onClick={submitPin} disabled={loading || transferCode.length !== 4}
                className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 grid place-items-center mx-auto mb-3">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="font-serif text-xl text-[#0f2b5b]">Step 2 of 2 — Verify</h3>
              <p className="text-sm text-gray-500 mt-1">
                A 6-digit code has been sent to <strong>{otpDestination}</strong>
              </p>
            </div>

            <div className="text-center text-xs text-gray-500 mb-5 bg-gray-50 rounded-md py-2 px-3">
              Authorising <strong>{money(amount)}</strong> to {enquiry?.accountName}
            </div>

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">{otpError}</div>
            )}

            <div className="flex gap-2 justify-center mb-5">
              {otp.map((digit, idx) => (
                <input key={idx} ref={el => otpRefs.current[idx] = el}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKey(idx, e)}
                  className="w-10 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:border-[#0f2b5b] focus:ring-2 focus:ring-[#0f2b5b]/20 outline-none" />
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowOtpModal(false); setOtp(['','','','','','']); setOtpError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition">
                Cancel
              </button>
              <button onClick={confirmOtp} disabled={otpLoading || otp.join('').length !== 6}
                className="btn-primary flex-1 disabled:opacity-50">
                {otpLoading ? 'Verifying…' : 'Confirm Transfer'}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Didn't receive the code? It expires in 10 minutes.
            </p>
          </div>
        </div>
      )}

      {receipt && <Receipt receipt={receipt} onClose={clearForm} />}
    </div>
  );
}