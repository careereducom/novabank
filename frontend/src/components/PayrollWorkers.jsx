import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const BANKS = [
  { name: 'JPMorgan Chase Bank, New York, NY', routing: '021000021' },
  { name: 'Wells Fargo Bank, San Francisco, CA', routing: '121000248' },
  { name: 'Bank of America, Charlotte, NC', routing: '026009593' },
  { name: 'USAA Federal Savings Bank, San Antonio, TX', routing: '314074269' },
  { name: 'Citibank, New York, NY', routing: '021000089' },
  { name: 'PNC Bank, Pittsburgh, PA', routing: '031000503' },
  { name: 'TD Bank, Cherry Hill, NJ', routing: '021214891' },
  { name: 'Capital One, McLean, VA', routing: '051000017' },
  { name: 'Fifth Third Bank, Cincinnati, OH', routing: '042000013' },
  { name: 'Regions Bank, Birmingham, AL', routing: '062000019' },
];

const CATEGORIES = ['STAFF', 'CONTRACTOR', 'VOLUNTEER', 'TASK'];
const DEPARTMENTS = ['Education', 'Kitchen', 'Medical', 'Admin', 'Facilities', 'General'];

export default function PayrollWorkers() {
  const { token } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const emptyForm = {
    fullName: '', role: '', category: 'STAFF', department: 'Education',
    email: '', phone: '', monthlySalary: '', bankName: '', bankRoutingNumber: '',
    bankAccountNumber: '', photoUrl: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/payroll/workers', {}, token);
      setWorkers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErr('');
    setShowModal(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      fullName: w.fullName || '',
      role: w.role || '',
      category: w.category || 'STAFF',
      department: w.department || 'Education',
      email: w.email || '',
      phone: w.phone || '',
      monthlySalary: w.monthlySalary || '',
      bankName: w.bankName || '',
      bankRoutingNumber: w.bankRoutingNumber || '',
      bankAccountNumber: w.bankAccountNumber || '',
      photoUrl: w.photoUrl || '',
      notes: w.notes || '',
    });
    setErr('');
    setShowModal(true);
  };

  const save = async () => {
    setErr('');
    if (!form.fullName.trim()) return setErr('Full name is required.');
    if (!form.role.trim()) return setErr('Role is required.');

    try {
      if (editing) {
        await apiFetch(`/payroll/workers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        }, token);
      } else {
        await apiFetch('/payroll/workers', {
          method: 'POST',
          body: JSON.stringify(form),
        }, token);
      }
      setShowModal(false);
      load();
    } catch (e) { setErr(e.message || 'Save failed.'); }
  };

  const deactivate = async (w) => {
    if (!confirm(`Deactivate ${w.fullName}? They will no longer appear on payroll.`)) return;
    try {
      await apiFetch(`/payroll/workers/${w.id}`, { method: 'DELETE' }, token);
      load();
    } catch (e) { alert(e.message); }
  };

  const setField = k => e => setForm({ ...form, [k]: e.target.value });

  const onBankChange = (name) => {
    const bank = BANKS.find(b => b.name === name);
    setForm({ ...form, bankName: name, bankRoutingNumber: bank?.routing || form.bankRoutingNumber });
  };

  const filtered = workers.filter(w => {
    if (deptFilter !== 'ALL' && w.department !== deptFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(s) ||
      w.role.toLowerCase().includes(s) ||
      (w.email || '').toLowerCase().includes(s) ||
      (w.bankName || '').toLowerCase().includes(s)
    );
  });

  const totalMonthly = workers.reduce((s, w) => s + Number(w.monthlySalary || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Workers Registry</p>
          <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">
            {workers.length} Active Workers
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monthly payroll commitment: <strong>{money(totalMonthly)}</strong>
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <span className="text-lg">+</span> Add Worker
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, email..."
            className="flex-1 outline-none text-sm py-1 bg-transparent"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white">
          <option value="ALL">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Workers Grid */}
      {loading && <p className="text-center text-gray-400 py-12">Loading workers...</p>}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500">No workers match your filter.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(w => (
          <div key={w.id} className="card p-5 hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-4">
              {w.photoUrl ? (
                <img src={w.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#0f2b5b] text-white grid place-items-center font-bold text-lg flex-shrink-0">
                  {w.fullName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate">{w.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{w.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    w.category === 'STAFF' ? 'bg-blue-50 text-blue-700' :
                    w.category === 'CONTRACTOR' ? 'bg-purple-50 text-purple-700' :
                    w.category === 'VOLUNTEER' ? 'bg-green-50 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {w.category}
                  </span>
                  <span className="text-[9px] text-gray-400">{w.department}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Monthly</span>
                <span className="font-semibold text-gray-800">{money(w.monthlySalary || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="text-gray-700 text-right truncate max-w-[140px]">
                  {(w.bankName || '—').split(',')[0]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account</span>
                <span className="font-mono text-gray-700">
                  ••••{String(w.bankAccountNumber || '').slice(-4)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openEdit(w)}
                className="flex-1 border border-gray-300 hover:border-[#0f2b5b] hover:text-[#0f2b5b] text-gray-700 font-semibold text-xs py-2 rounded-md transition">
                Edit
              </button>
              <button
                onClick={() => deactivate(w)}
                className="border border-gray-300 hover:border-red-500 hover:text-red-600 text-gray-500 font-semibold text-xs py-2 px-3 rounded-md transition">
                Deactivate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl text-[#0f2b5b]">
                  {editing ? 'Edit Worker' : 'Add New Worker'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editing ? 'Update worker details' : 'Register a new worker on the payroll'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {err && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {err}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input className="field" value={form.fullName} onChange={setField('fullName')}
                    placeholder="e.g. Grace Anderson" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Role *
                  </label>
                  <input className="field" value={form.role} onChange={setField('role')}
                    placeholder="e.g. Head Teacher" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Monthly Salary ($)
                  </label>
                  <input type="number" className="field" value={form.monthlySalary} onChange={setField('monthlySalary')}
                    placeholder="0.00" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select className="field" value={form.category} onChange={setField('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select className="field" value={form.department} onChange={setField('department')}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input className="field" value={form.email} onChange={setField('email')}
                    placeholder="worker@email.com" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Phone
                  </label>
                  <input className="field" value={form.phone} onChange={setField('phone')}
                    placeholder="2125551234" />
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <p className="text-xs font-bold text-[#0f2b5b] uppercase tracking-wider mb-3">
                    Bank Account for Payments
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Bank
                  </label>
                  <select className="field" value={form.bankName} onChange={e => onBankChange(e.target.value)}>
                    <option value="">Select bank...</option>
                    {BANKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Routing Number
                  </label>
                  <input className="field font-mono" value={form.bankRoutingNumber}
                    onChange={setField('bankRoutingNumber')} placeholder="9-digit routing" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Account Number
                  </label>
                  <input className="field font-mono" value={form.bankAccountNumber}
                    onChange={setField('bankAccountNumber')} placeholder="Account number" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Photo URL (optional)
                  </label>
                  <input className="field" value={form.photoUrl} onChange={setField('photoUrl')}
                    placeholder="https://..." />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <textarea className="field" rows="2" value={form.notes} onChange={setField('notes')}
                    placeholder="Any additional info..." />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={save}
                className="px-8 py-2.5 bg-[#0f2b5b] hover:bg-[#0a2148] text-white font-bold rounded-md">
                {editing ? 'Save Changes' : 'Add Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}