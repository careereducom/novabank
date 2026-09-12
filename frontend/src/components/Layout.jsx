import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import LiveChat from './LiveChat';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [seconds, setSeconds] = useState(8 * 60 * 60);
  useEffect(() => {
    const i = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const nav = [
    { to: '/dashboard',      label: 'Accounts' },
    { to: '/transfer',       label: 'Transfer' },
    { to: '/bills',          label: 'Pay Bills' },
    { to: '/deposit',        label: 'Deposit' },
    { to: '/statement',      label: 'Statements' },
    { to: '/cards',          label: 'Cards' },
    { to: '/direct-deposit', label: 'Direct Deposit' },
    { to: '/history',        label: 'History' },
    { to: '/help',           label: 'Help' },
  ];
  if (user?.isAdmin) nav.push({ to: '/admin', label: 'Operations' });

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa]">
      <header className="bg-[#0f2b5b] text-white sticky top-0 z-40 shadow">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white grid place-items-center">
              <span className="text-[#0f2b5b] font-serif font-bold text-base">CFB</span>
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="font-serif font-bold text-sm tracking-wide">CONTINENTAL FEDERAL</p>
              <p className="text-[9px] tracking-[.25em] text-blue-200">BANK &amp; TRUST</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <div className="hidden md:flex items-center gap-2 text-blue-100 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Secure session
            </div>
            <span className="hidden md:block font-mono text-xs text-blue-200">
              {hh}:{mm}:{ss}
            </span>
<NotificationBell />
            <span className="hidden md:block text-blue-100 text-xs">{user?.fullName}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="bg-[#b1122b] hover:bg-[#8c0d21] px-4 py-2 rounded-md text-xs font-bold tracking-wide transition">
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {nav.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-[3px] transition ${
                pathname === n.to
                  ? 'border-[#0f2b5b] text-[#0f2b5b]'
                  : 'border-transparent text-gray-500 hover:text-[#0f2b5b]'
              }`}>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Outlet />
      </main>

      <LiveChat />

      <footer className="bg-white border-t border-gray-200 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Continental Federal Bank &amp; Trust. Member FDIC. Equal Housing Lender.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#0f2b5b]">Security</a>
            <a href="#" className="hover:text-[#0f2b5b]">Privacy</a>
            <a href="#" className="hover:text-[#0f2b5b]">Terms</a>
            <span className="font-mono">SWIFT: CBFBUS33</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
