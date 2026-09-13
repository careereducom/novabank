import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const CATEGORIES = [
  { value: 'SALARY',    label: 'Salary',         icon: '💼' },
  { value: 'TASK',      label: 'Task Payment',   icon: '✓' },
  { value: 'BONUS',     label: 'Bonus',          icon: '⭐' },
  { value: 'EMERGENCY', label: 'Emergency Fund', icon: '⚠' },
  { value: 'MEDICAL',   label: 'Medical Expense', icon: '⚕' },
  { value: 'EDUCATION', label: 'Education Fund', icon: '📚' },
  { value: 'OTHER',     label: 'Other',          icon: '●' },
];

export default function PayrollPay() {
  const { token, accounts } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('SALARY');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const payrollAccount = accounts.find(a => a.accountType === 'payroll');
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  useEffect(() => {
    if (!token) return;
    apiFetch('/payroll/workers', {}, token).then(setWorkers).catch(() => {});
  }, [token]);

  const filtered = workers.filter(w => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return w.fullName.toLowerCase().includes(s) || w.role.toLowerCase().includes(s);
  });

  const initiate = () => {
    setErr('');
    if (!selected) return setErr('Select a worker first.');
    if (!amount || Number(amount) <= 0) return setErr('Enter a valid amount.');
    const available = Number(payrollAccount?.available ?? payrollAccount?.balance ?? 0);
    if (Number(amount) > available) {
      return setErr(`Insufficient funds. Available: ${money(available)}`);
    }
    setShowPin(true);
  };

  const confirm = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await apiFetch('/payroll/pay', {
        method: 'POST',
        body: JSON.stringify({
          workerId: selected.id,
          amount: Number(amount),
          category,
          description: description || undefined,
          pin,
        }),
      }, token);
      setShowPin(false);
      setReceipt(res.payment);
      setPin('');
      setAmount('');
      setDescription('');
      setSelected(null);
      // Refresh accounts
      const fresh = await apiFetch('/accounts', {}, token);
      // update global accounts (if you have refreshAccounts available)
    } catch (e) {
      setErr(e.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (paymentId) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/payroll/payments/${paymentId}/payslip`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${paymentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Payroll</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">Pay a Worker</h1>
        <p className="text-gray-500 text-sm mt-1">
          Available funds: {money(payrollAccount?.available ?? payrollAccount?.balance ?? 0)}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT — Worker list */}
        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-3">
            Step 1 — Select Worker
          </p>
          <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 mb-3">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workers..."
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-1">
            {filtered.map(w => (
              <button
                key={w.id}
                onClick={() => { setSelected(w); setAmount(w.monthlySalary || ''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${
                  selected?.id === w.id ? 'bg-[#0f2b5b] text-white' : 'hover:bg-gray-50'
                }`}>
                {w.photoUrl ? (
                  <img src={w.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-10 h-10 rounded-full grid place-items-center font-bold flex-shrink-0 ${selected?.id === w.id ? 'bg-white text-[#0f2b5b]' : 'bg-[#0f2b5b] text-white'}`}>
                    {w.fullName.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{w.fullName}</p>
                  <p className={`text-xs truncate ${selected?.id === w.id ? 'text-blue-100' : 'text-gray-500'}`}>
                    {w.role} · {w.department}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-bold ${selected?.id === w.id ? 'text-white' : 'text-gray-700'}`}>
                    {money(w.monthlySalary || 0)}
                  </p>
                  <p className={`text-[10px] ${selected?.id === w.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    /month
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Payment form */}
        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-3">
            Step 2 — Payment Details
          </p>

          {!selected && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">👈</p>
              <p className="text-sm">Select a worker to begin</p>
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              {/* Selected worker banner */}
              <div className="bg-[#f4f6fa] rounded-lg p-4 flex items-center gap-3">
                {selected.photoUrl ? (
                  <img src={selected.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0f2b5b] text-white grid place-items-center font-bold text-lg">
                    {selected.fullName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{selected.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{selected.role}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {(selected.bankName || 'External Bank').split(',')[0]} · ••••{String(selected.bankAccountNumber || '').slice(-4)}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="field font-serif text-lg"
                  placeholder="0.00"
                />
                <div className="flex gap-2 mt-2">
                  {[selected.monthlySalary, 500, 1000, 2000].filter(Boolean).map(v => (
                    <button key={v} onClick={() => setAmount(v)}
                      className="text-xs px-3 py-1 border border-gray-300 rounded-full hover:border-[#0f2b5b] hover:text-[#0f2b5b] transition">
                      {money(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Payment Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                        category === c.value
                          ? 'bg-[#0f2b5b] text-white'
                          : 'border border-gray-300 text-gray-700 hover:border-[#0f2b5b]'
                      }`}>
                      <span>{c.icon}</span>
                      <span className="text-xs font-semibold truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="field"
                  placeholder={`${category.toLowerCase()} for ${selected.fullName.split(' ')[0]}`}
                />
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {err}
                </div>
              )}

              <button onClick={initiate} className="btn-primary w-full py-3.5">
                Continue to PIN →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PIN MODAL */}
      {showPin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-1">Enter Payroll PIN</h3>
            <p className="text-sm text-gray-500 mb-5">
              Authorise this payment with your 4-digit PIN
            </p>

            <div className="text-center font-serif text-3xl font-bold text-[#0f2b5b] mb-2">
              {money(amount)}
            </div>
            <div className="text-center text-xs text-gray-500 mb-5">
              To <strong>{selected?.fullName}</strong><br/>
              <span className="text-gray-400">{selected?.bankName}</span>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                {err}
              </div>
            )}

            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-[1em] font-mono px-4 py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0f2b5b] focus:border-transparent outline-none"
              placeholder="••••"
              autoFocus
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowPin(false); setPin(''); setErr(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition">
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={loading || pin.length !== 4}
                className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 grid place-items-center mx-auto mb-3">
                <span className="text-green-600 text-3xl">✓</span>
              </div>
              <h3 className="font-serif text-xl text-[#0f2b5b]">Payment Sent</h3>
              <p className="text-sm text-gray-500 mt-1">Reference {receipt.reference}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Worker</span>
                <span className="font-semibold">{receipt.worker.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="text-gray-700">{receipt.worker.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="text-gray-700">{receipt.worker.bankName}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-green-600">{money(receipt.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-semibold">{receipt.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => downloadPayslip(receipt.id)}
                className="bg-[#0f2b5b] hover:bg-[#0a2148] text-white font-bold py-3 rounded-md transition text-sm">
                ⬇ Download Payslip
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-md transition text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}