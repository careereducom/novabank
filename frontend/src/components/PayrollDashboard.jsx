import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function PayrollDashboard() {
  const { token, accounts } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const payrollAccount = accounts.find(a => a.accountType === 'payroll');

  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const stamp = iso => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/payroll/stats', {}, token),
      apiFetch('/payroll/payments?limit=8', {}, token),
    ])
      .then(([s, r]) => { setStats(s); setRecentPayments(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading payroll data...</div>;
  }

  if (!payrollAccount) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600">No payroll account found on your profile.</p>
      </div>
    );
  }

  const totalMonthly = stats?.monthlyPayrollCost || 0;
  const departmentTotals = stats?.byDepartment || {};
  const categoryTotals = stats?.byCategory || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Payroll Overview</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">
          Good day, {payrollAccount.accountName.split('—')[0].trim()}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Managing {stats?.workerCount || 0} workers · Monthly payroll {money(totalMonthly)}
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Available Funds</p>
          <p className="font-serif text-2xl font-bold text-[#0f2b5b] mt-2">
            {money(stats?.account?.available || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.account?.pendingOut > 0 ? `${money(stats.account.pendingOut)} pending` : 'Ready to disburse'}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Active Workers</p>
          <p className="font-serif text-2xl font-bold text-[#0f2b5b] mt-2">{stats?.workerCount || 0}</p>
          <p className="text-xs text-gray-400 mt-1">On payroll</p>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">This Month</p>
          <p className="font-serif text-2xl font-bold text-green-600 mt-2">
            {money(stats?.thisMonth?.total || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{stats?.thisMonth?.count || 0} payments made</p>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Monthly Cost</p>
          <p className="font-serif text-2xl font-bold text-amber-600 mt-2">{money(totalMonthly)}</p>
          <p className="text-xs text-gray-400 mt-1">Recurring</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/payroll/pay" className="btn-primary flex items-center justify-center gap-2 text-sm py-4">
          <span className="text-lg">↗</span> Pay a Worker
        </Link>
        <Link to="/payroll/batch" className="card p-4 flex items-center justify-center gap-2 hover:border-[#0f2b5b] transition text-sm font-semibold">
          <span className="text-lg">⊞</span> Batch Payment
        </Link>
        <Link to="/payroll/workers" className="card p-4 flex items-center justify-center gap-2 hover:border-[#0f2b5b] transition text-sm font-semibold">
          <span className="text-lg">☰</span> Manage Workers
        </Link>
        <Link to="/payroll/reports" className="card p-4 flex items-center justify-center gap-2 hover:border-[#0f2b5b] transition text-sm font-semibold">
          <span className="text-lg">▤</span> View Reports
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* By Department */}
        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">Monthly Cost by Department</p>
          {Object.entries(departmentTotals).length === 0 && (
            <p className="text-gray-400 text-sm">No data yet.</p>
          )}
          {Object.entries(departmentTotals).map(([dept, amount]) => {
            const pct = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0;
            return (
              <div key={dept} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700">{dept}</span>
                  <span className="text-gray-500">{money(amount)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f2b5b]" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* By Category (all-time payments) */}
        <div className="card p-6">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">All-Time Payments by Category</p>
          {Object.entries(categoryTotals).length === 0 && (
            <p className="text-gray-400 text-sm">No payments yet.</p>
          )}
          {Object.entries(categoryTotals).slice(0, 7).map(([cat, amount]) => (
            <div key={cat} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-semibold text-gray-700 capitalize">
                {cat.toLowerCase()}
              </span>
              <span className="text-sm text-gray-600">{money(amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">Recent Payments</p>
          <Link to="/payroll/history" className="text-xs font-semibold text-[#0f2b5b] hover:underline">
            View all →
          </Link>
        </div>

        {recentPayments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            No payroll payments yet. Start by paying a worker.
          </p>
        )}

        <div className="space-y-2">
          {recentPayments.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
              {p.worker.photoUrl ? (
                <img src={p.worker.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0f2b5b] text-white grid place-items-center font-bold flex-shrink-0">
                  {p.worker.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{p.worker.name}</p>
                <p className="text-xs text-gray-500">{p.worker.role} · {stamp(p.paidAt)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-800">{money(p.amount)}</p>
                <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}