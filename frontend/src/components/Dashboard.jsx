import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Dashboard() {
  const { user, accounts, token } = useAuth();
  const [recent, setRecent] = useState([]);

  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const stamp = iso => {
    const d = new Date(iso);
    const now = new Date();
    const days = Math.floor((now - d) / 86400000);
    if (days === 0) return 'Today · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return days + ' days ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    if (!token) return;
    apiFetch('/transfers/history', {}, token)
      .then(data => setRecent(data.slice(0, 6)))
      .catch(() => {});
  }, [token]);

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Account Overview</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">
          Welcome, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </p>
      </div>

      <div className="bg-gradient-to-br from-[#0f2b5b] to-[#0a2148] text-white rounded-xl p-8 mb-6 shadow-lg">
        <p className="text-xs font-bold tracking-[.25em] text-blue-200 uppercase">
          Total Deposits
        </p>
        <p className="font-serif text-5xl font-bold mt-3">{money(total)}</p>
        <p className="text-blue-200 text-sm mt-3">
          {accounts.length} account{accounts.length > 1 ? 's' : ''} · FDIC insured up to $250,000
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {accounts.map(a => (
          <div key={a.id} className="card p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[10px] font-bold tracking-[.2em] text-gray-400 uppercase">
                  {a.accountType}
                </p>
                <p className="font-mono text-xs text-gray-500 mt-1">{a.accountNumber}</p>
              </div>
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Available</p>
            <p className="font-serif text-3xl font-bold text-[#0f2b5b]">
              {money(a.balance)}
            </p>

            <div className="divider my-5"></div>

            <div className="flex gap-3">
              <Link to="/transfer" className="btn-primary flex-1 text-center text-sm py-3">
                Transfer
              </Link>
              <Link to="/statement" className="flex-1 text-center border border-gray-300 hover:border-[#0f2b5b] hover:text-[#0f2b5b] text-gray-700 font-semibold text-sm py-3 rounded-md transition">
                Statement
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase mb-4">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/transfer', label: 'Send Money',    icon: '↗' },
            { to: '/bills',    label: 'Pay Bills',     icon: '⌂' },
            { to: '/deposit',  label: 'Deposit Check', icon: '⬇' },
            { to: '/history',  label: 'Transactions',  icon: '≡' },
          ].map(x => (
            <Link key={x.to} to={x.to}
              className="card p-5 hover:border-[#0f2b5b] hover:shadow-md transition text-center">
              <p className="text-3xl text-[#0f2b5b] mb-2">{x.icon}</p>
              <p className="text-sm font-semibold text-gray-800">{x.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">
            Recent Activity
          </p>
          <Link to="/history" className="text-xs font-semibold text-[#0f2b5b] hover:underline">
            View all →
          </Link>
        </div>

        <div className="card overflow-hidden">
          {recent.length === 0 && (
            <p className="p-8 text-center text-gray-400 text-sm">No recent transactions.</p>
          )}
          {recent.map((t, i) => {
            const isCredit = t.toAccountId && accounts.some(a => a.id === t.toAccountId);
            return (
              <div key={t.id} className={`flex justify-between gap-4 p-4 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50 transition`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {t.description || t.type}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stamp(t.createdAt)} · {t.reference.slice(0, 12)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                    {isCredit ? '+' : '−'}{money(t.amount)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.status === 'PENDING' ? 'PROCESSING' : t.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}