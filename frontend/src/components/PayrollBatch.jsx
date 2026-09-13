import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const CATEGORIES = [
  { value: 'SALARY',    label: 'Monthly Salary' },
  { value: 'TASK',      label: 'Task Payment'   },
  { value: 'BONUS',     label: 'Bonus'          },
  { value: 'EMERGENCY', label: 'Emergency Fund' },
  { value: 'MEDICAL',   label: 'Medical'        },
  { value: 'EDUCATION', label: 'Education'      },
];

export default function PayrollBatch() {
  const { token, accounts } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState({});          // id -> amount
  const [category, setCategory] = useState('SALARY');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const payrollAccount = accounts.find(a => a.accountType === 'payroll');
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  useEffect(() => {
    if (!token) return;
    apiFetch('/payroll/workers', {}, token).then(setWorkers).catch(() => {});
  }, [token]);

  // Selection helpers
  const toggle = (w) => {
    const next = { ...selected };
    if (next[w.id] !== undefined) {
      delete next[w.id];
    } else {
      next[w.id] = w.monthlySalary || 0;
    }
    setSelected(next);
  };

  const setAmount = (id, val) => {
    setSelected({ ...selected, [id]: Number(val) });
  };

  const selectAll = () => {
    const next = {};
    filtered.forEach(w => { next[w.id] = w.monthlySalary || 0; });
    setSelected(next);
  };

  const clearAll = () => setSelected({});

  const selectByCategory = (cat) => {
    const next = { ...selected };
    filtered.filter(w => w.category === cat).forEach(w => {
      next[w.id] = w.monthlySalary || 0;
    });
    setSelected(next);
  };

  const filtered = workers.filter(w => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(s) ||
      w.role.toLowerCase().includes(s) ||
      w.department.toLowerCase().includes(s)
    );
  });

  const selectedIds = Object.keys(selected);
  const totalAmount = Object.values(selected).reduce((s, v) => s + Number(v || 0), 0);
  const available = Number(payrollAccount?.available ?? payrollAccount?.balance ?? 0);

  const initiate = () => {
    setErr('');
    if (selectedIds.length === 0) return setErr('Select at least one worker.');
    if (totalAmount <= 0) return setErr('Enter amounts for selected workers.');
    if (totalAmount > available) {
      return setErr(`Insufficient funds. Total needed ${money(totalAmount)}, available ${money(available)}`);
    }
    setShowPin(true);
  };

  const confirm = async () => {
    setErr(''); setLoading(true);
    try {
      const payments = selectedIds.map(id => ({
        workerId: id,
        amount: Number(selected[id]),
        category,
        description: description || `${category.toLowerCase()} payment`,
      }));

      const res = await apiFetch('/payroll/batch', {
        method: 'POST',
        body: JSON.stringify({ payments, pin }),
      }, token);

      setShowPin(false);
      setResult(res);
      setPin('');
      setSelected({});
      setDescription('');
    } catch (e) {
      setErr(e.message || 'Batch payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Payroll</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">Batch Payment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pay multiple workers in one submission — single PIN authorises all
        </p>
      </div>

      {/* Category + Description bar */}
      <div className="card p-5 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Payment Category
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="field">
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="field"
              placeholder={`${category.toLowerCase()} for all selected workers`}
            />
          </div>
        </div>
      </div>

      {/* Selection toolbar */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workers..."
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={selectAll}
              className="px-3 py-2 bg-[#0f2b5b] hover:bg-[#0a2148] text-white text-xs font-bold rounded-md">
              Select All ({filtered.length})
            </button>
            <button onClick={() => selectByCategory('STAFF')}
              className="px-3 py-2 border border-gray-300 hover:border-[#0f2b5b] text-xs font-semibold rounded-md">
              All Staff
            </button>
            <button onClick={() => selectByCategory('CONTRACTOR')}
              className="px-3 py-2 border border-gray-300 hover:border-[#0f2b5b] text-xs font-semibold rounded-md">
              All Contractors
            </button>
            <button onClick={clearAll}
              className="px-3 py-2 border border-gray-300 hover:border-red-500 hover:text-red-600 text-xs font-semibold rounded-md">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Workers list */}
      <div className="card p-2 max-h-[500px] overflow-y-auto mb-4">
        {filtered.map(w => {
          const isSelected = selected[w.id] !== undefined;
          return (
            <div key={w.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(w)}
                className="w-5 h-5 accent-[#0f2b5b] cursor-pointer flex-shrink-0"
              />

              {w.photoUrl ? (
                <img src={w.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0f2b5b] text-white grid place-items-center font-bold flex-shrink-0">
                  {w.fullName.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{w.fullName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {w.role} · {(w.bankName || '—').split(',')[0]}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  value={isSelected ? selected[w.id] : ''}
                  onChange={e => setAmount(w.id, e.target.value)}
                  onFocus={() => { if (!isSelected) toggle(w); }}
                  className="w-24 text-right text-sm font-semibold px-2 py-1.5 border border-gray-300 rounded-md outline-none focus:border-[#0f2b5b]"
                  placeholder={String(w.monthlySalary || 0)}
                  disabled={!isSelected}
                />
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No workers match.</p>
        )}
      </div>

      {/* Summary bar */}
      <div className="card p-5 bg-gradient-to-br from-[#0f2b5b] to-[#0a2148] text-white sticky bottom-4">
        <div className="grid md:grid-cols-4 gap-4 items-center">
          <div>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Selected</p>
            <p className="text-xl font-bold">{selectedIds.length} workers</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Total Amount</p>
            <p className="text-xl font-bold">{money(totalAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Available</p>
            <p className="text-xl font-bold text-green-300">{money(available)}</p>
          </div>
          <div className="text-right">
            <button
              onClick={initiate}
              disabled={selectedIds.length === 0 || totalAmount > available}
              className="px-8 py-3 bg-[#c9a227] hover:bg-[#a8861f] text-[#0f2b5b] font-bold rounded-md transition disabled:opacity-40">
              Submit Batch →
            </button>
          </div>
        </div>
      </div>

      {/* PIN MODAL */}
      {showPin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-1">Confirm Batch Payment</h3>
            <p className="text-sm text-gray-500 mb-5">
              Authorise {selectedIds.length} payments with your 4-digit PIN
            </p>

            <div className="text-center font-serif text-3xl font-bold text-[#0f2b5b] mb-5">
              {money(totalAmount)}
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
                {loading ? 'Processing…' : 'Confirm Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL */}
      {result && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 grid place-items-center mx-auto mb-3">
                <span className="text-green-600 text-3xl">✓</span>
              </div>
              <h3 className="font-serif text-xl text-[#0f2b5b]">
                Batch Sent — {result.count} Workers
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Total: {money(result.total)} · Batch {result.batchRef}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto mb-5">
              {result.payments.map((p, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-700 truncate">{p.worker}</span>
                  <span className="font-semibold text-gray-800">{money(p.amount)}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setResult(null)}
              className="btn-primary w-full">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}