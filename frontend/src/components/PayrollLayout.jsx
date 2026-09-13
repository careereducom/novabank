import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LiveChat from './LiveChat';

export default function PayrollLayout() {
  const { user, accounts, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const payrollAccount = accounts.find(a => a.accountType === 'payroll');
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const nav = [
    { to: '/payroll/dashboard', label: 'Dashboard',       icon: '◫' },
    { to: '/payroll/workers',   label: 'Workers',          icon: '☰' },
    { to: '/payroll/pay',       label: 'New Payment',      icon: '↗' },
    { to: '/payroll/batch',     label: 'Batch Payment',    icon: '⊞' },
    { to: '/payroll/history',   label: 'Payment History',  icon: '⌛' },
    { to: '/payroll/reports',   label: 'Reports',          icon: '▤' },
  ];

  return (
    <div className="min-h-screen flex bg-[#f4f6fa]">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#0f2b5b] text-white flex flex-col transition-all duration-200 fixed h-screen z-40`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-md bg-white grid place-items-center flex-shrink-0">
            <span className="text-[#0f2b5b] font-serif font-bold text-lg">SM</span>
          </div>
          {sidebarOpen && (
            <div className="ml-3 leading-tight overflow-hidden">
              <p className="font-serif font-bold text-sm">ST. MARY'S</p>
              <p className="text-[10px] tracking-[.2em] text-blue-200">PAYROLL CONSOLE</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {nav.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition ${
                pathname === n.to
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/5 hover:text-white'
              }`}>
              <span className="text-lg flex-shrink-0">{n.icon}</span>
              {sidebarOpen && <span className="text-sm font-semibold">{n.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Balance widget */}
        {payrollAccount && sidebarOpen && (
          <div className="mx-3 mb-3 bg-white/10 rounded-lg p-3">
            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Available</p>
            <p className="font-serif text-lg font-bold mt-0.5">
              {money(Number(payrollAccount.available ?? payrollAccount.balance))}
            </p>
            <p className="text-[10px] text-blue-200 mt-0.5">
              Acct {payrollAccount.accountNumber}
            </p>
          </div>
        )}

        {/* User / Sign out */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-red-300 transition ${sidebarOpen ? '' : 'justify-center'}`}>
            <span className="text-lg">⏻</span>
            {sidebarOpen && <span className="text-sm font-semibold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-200`}>
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-[#0f2b5b] text-xl">
              ☰
            </button>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Payroll Officer</p>
              <p className="font-bold text-[#0f2b5b] text-sm">{user?.fullName || 'Payroll Officer'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-2 text-xs text-green-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Secure session
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <footer className="bg-white border-t border-gray-200 py-4 text-center">
          <p className="text-xs text-gray-400">
            St. Mary's Orphanage — Payroll Console · Powered by Continental Federal Bank &amp; Trust
          </p>
        </footer>
      </div>

      <LiveChat />
    </div>
  );
}