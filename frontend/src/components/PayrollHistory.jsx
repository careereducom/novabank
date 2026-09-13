import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const CATEGORY_LABELS = {
  ALL: 'All Categories',
  SALARY: 'Salary',
  TASK: 'Task Payment',
  BONUS: 'Bonus',
  EMERGENCY: 'Emergency',
  MEDICAL: 'Medical',
  EDUCATION: 'Education',
  OTHER: 'Other',
};

export default function PayrollHistory() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const stamp = iso => new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const load = async () => {
    setLoading(true);
    try {
      const qs = categoryFilter !== 'ALL' ? `?category=${categoryFilter}` : '';
      const data = await apiFetch(`/payroll/payments${qs}`, {}, token);
      setPayments(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, categoryFilter]);

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

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.worker.name.toLowerCase().includes(s) ||
      p.reference.toLowerCase().includes(s) ||
      (p.description || '').toLowerCase().includes(s)
    );
  });

  const totalFiltered = filtered.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Payroll</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">Payment History</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every payroll disbursement on record
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by worker, reference, description..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="text-xs text-gray-500 font-semibold">
          {filtered.length} payments · Total {money(totalFiltered)}
        </div>
      </div>

      {loading && (
        <p className="text-center text-gray-400 py-12">Loading payments...</p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No payments found.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Bank</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {p.worker.photoUrl ? (
                          <img src={p.worker.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#0f2b5b] text-white grid place-items-center text-xs font-bold">
                            {p.worker.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">{p.worker.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{p.worker.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-700 truncate max-w-[140px]">
                        {(p.worker.bankName || '—').split(',')[0]}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        ••••{String(p.worker.bankAccountNumber || '').slice(-4)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-gray-500">{p.reference}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{stamp(p.paidAt)}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-800 whitespace-nowrap">
                      {money(p.amount)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => downloadPayslip(p.id)}
                        className="text-xs font-semibold text-[#0f2b5b] hover:underline">
                        ⬇ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-serif text-xl text-[#0f2b5b]">Payment Detail</h3>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(selectedPayment, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}