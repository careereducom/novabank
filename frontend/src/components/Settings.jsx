import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Settings() {
  const { user, token } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!/^\d{4}$/.test(newPin)) return setError('New PIN must be exactly 4 digits.');
    if (newPin !== confirmPin) return setError('New PIN and confirmation do not match.');
    if (currentPin === newPin) return setError('New PIN must be different from current.');

    setLoading(true);
    try {
      await apiFetch('/auth/change-pin', {
        method: 'POST',
        body: JSON.stringify({ currentPin, newPin })
      }, token);
      setSuccess('Transfer PIN updated successfully.');
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } catch (err) {
      setError(err.message || 'Failed to update PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0f2b5b]">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account security</p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg text-[#0f2b5b] mb-4">Profile</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Name</span>
            <span className="font-semibold text-gray-800">{user?.fullName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Email</span>
            <span className="font-mono text-gray-800">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Role</span>
            <span className="font-semibold text-gray-800">
              {user?.isAdmin ? 'Administrator' : 'Client'}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-serif text-lg text-[#0f2b5b] mb-1">Change Transfer PIN</h2>
        <p className="text-sm text-gray-500 mb-5">
          Your 4-digit PIN is required to authorise every outbound transfer.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mb-4">
            ✓ {success}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Current PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="field font-mono tracking-[0.5em] text-center"
              placeholder="••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              New PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="field font-mono tracking-[0.5em] text-center"
              placeholder="••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Confirm New PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="field font-mono tracking-[0.5em] text-center"
              placeholder="••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
            className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Updating…' : 'Update PIN'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            🔒 <strong>Security note:</strong> After 3 incorrect PIN attempts,
            your account will be locked for 30 minutes. You'll receive a notification
            each time a PIN attempt fails.
          </p>
        </div>
      </div>
    </div>
  );
}