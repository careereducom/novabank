import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    if (!token) return;
    try {
      const [list, count] = await Promise.all([
        apiFetch('/notifications', {}, token),
        apiFetch('/notifications/count', {}, token),
      ]);
      setNotifications(list || []);
      setUnread(count?.unread || 0);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, [token]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' }, token);
      load();
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' }, token);
      load();
    } catch {}
  };

  const iconFor = (type) => {
    switch (type) {
      case 'TRANSFER_OUT': return '↗';
      case 'TRANSFER_IN':  return '↙';
      case 'SETTLED':      return '✓';
      case 'FAILED':       return '⚠';
      case 'LOGIN':        return '🔐';
      default:             return '•';
    }
  };

  const colorFor = (type) => {
    switch (type) {
      case 'TRANSFER_OUT': return 'text-blue-600';
      case 'TRANSFER_IN':  return 'text-green-600';
      case 'SETTLED':      return 'text-green-600';
      case 'FAILED':       return 'text-red-600';
      case 'LOGIN':        return 'text-gray-600';
      default:             return 'text-gray-500';
    }
  };

  const stamp = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-white/10 transition"
        title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px]
                           font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-bold text-sm text-gray-800">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#0f2b5b] hover:underline font-semibold">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No notifications yet.</p>
            )}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition
                           ${n.status === 'UNREAD' ? 'bg-blue-50/40' : ''}`}>
                <div className="flex gap-3">
                  <span className={`text-lg ${colorFor(n.type)} flex-shrink-0 mt-0.5`}>
                    {iconFor(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-snug break-words">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {stamp(n.createdAt)}
                    </p>
                  </div>
                  {n.status === 'UNREAD' && (
                    <span className="w-2 h-2 rounded-full bg-[#0f2b5b] flex-shrink-0 mt-1.5"></span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}