import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Security() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/audit/me', {}, token)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const stamp = iso => new Date(iso).toLocaleString('en-US');

  return (
    <div>
      <h1 className="font-serif text-3xl text-[#0f2b5b] mb-2">Security Activity</h1>
      <p className="text-gray-500 mb-6">Recent sign-ins and account actions</p>

      <div className="card overflow-hidden">
        {loading && <p className="p-8 text-center text-gray-500">Loading…</p>}
        {!loading && logs.length === 0 && (
          <p className="p-8 text-center text-gray-500">No security events recorded yet.</p>
        )}
        {!loading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{stamp(l.createdAt)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{l.action}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{l.ip}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        l.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {l.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
