import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function PayrollReports() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/payroll/stats', {}, token),
      apiFetch('/payroll/workers', {}, token),
    ])
      .then(([s, w]) => { setStats(s); setWorkers(w); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-center text-gray-400 py-12">Loading reports...</p>;

  const byDepartment = stats?.byDepartment || {};
  const byCategory = stats?.byCategory || {};
  const totalMonthly = stats?.monthlyPayrollCost || 0;
  const totalAllTime = stats?.allTime?.total || 0;

  const maxDept = Math.max(1, ...Object.values(byDepartment));
  const maxCat = Math.max(1, ...Object.values(byCategory));

  const exportCSV = () => {
    const rows = [
      ['Worker', 'Role', 'Department', 'Category', 'Monthly Salary', 'Bank', 'Account'],
      ...workers.map(w => [
        w.fullName, w.role, w.department, w.category,
        w.monthlySalary || 0,
        w.bankName || '',
        w.bankAccountNumber || '',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-workers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Payroll</p>
          <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">Reports &amp; Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Full breakdown of payroll costs and distribution</p>
        </div>
        <button onClick={exportCSV} className="btn-primary">
          ⬇ Export Workers CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Active Workers</p>
          <p className="font-serif text-3xl font-bold text-[#0f2b5b] mt-2">{stats?.workerCount || 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Monthly Cost</p>
          <p className="font-serif text-3xl font-bold text-amber-600 mt-2">{money(totalMonthly)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">All-Time Paid</p>
          <p className="font-serif text-3xl font-bold text-green-600 mt-2">{money(totalAllTime)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">This Month</p>
          <p className="font-serif text-3xl font-bold text-[#0f2b5b] mt-2">
            {money(stats?.thisMonth?.total || 0)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">
            Monthly Payroll by Department
          </p>
          {Object.entries(byDepartment).length === 0 && (
            <p className="text-gray-400 text-sm">No data</p>
          )}
          {Object.entries(byDepartment)
            .sort((a, b) => b[1] - a[1])
            .map(([dept, amount]) => (
              <div key={dept} className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold text-gray-700">{dept}</span>
                  <span className="text-gray-600 font-semibold">{money(amount)}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0f2b5b] to-[#1e4a8a]"
                    style={{ width: `${(amount / maxDept) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
        </div>

        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">
            All-Time Payments by Category
          </p>
          {Object.entries(byCategory).length === 0 && (
            <p className="text-gray-400 text-sm">No payments yet</p>
          )}
          {Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => (
              <div key={cat} className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold text-gray-700 capitalize">
                    {cat.toLowerCase()}
                  </span>
                  <span className="text-gray-600 font-semibold">{money(amount)}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c9a227] to-[#a8861f]"
                    style={{ width: `${(amount / maxCat) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="card p-6">
        <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">
          Full Worker Roster
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3">Name</th>
                <th className="py-3">Role</th>
                <th className="py-3">Department</th>
                <th className="py-3">Bank</th>
                <th className="py-3 text-right">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 font-semibold text-gray-800">{w.fullName}</td>
                  <td className="py-2.5 text-gray-600 text-xs">{w.role}</td>
                  <td className="py-2.5 text-gray-600 text-xs">{w.department}</td>
                  <td className="py-2.5 text-gray-500 text-xs">{(w.bankName || '—').split(',')[0]}</td>
                  <td className="py-2.5 text-right font-bold text-gray-800">
                    {money(w.monthlySalary || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}