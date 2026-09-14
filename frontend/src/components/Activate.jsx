import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

export default function Activate() {
  const navigate = useNavigate();
  const [accountNumber, setAccountNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (accountNumber.length !== 10) return setError('Account number must be 10 digits.');
    if (accessCode.length !== 6) return setError('Access code must be 6 digits.');
    setLoading(true);
    try {
      await apiFetch('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ accountNumber, accessCode })
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Activation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa]">
      <header className="bg-[#0f2b5b] text-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white grid place-items-center">
              <span className="text-[#0f2b5b] font-serif font-bold text-xl">CFB</span>
            </div>
            <div className="leading-tight">
              <p className="font-serif font-bold text-[15px] tracking-wide">CONTINENTAL FEDERAL</p>
              <p className="text-[10px] tracking-[.25em] text-blue-200">BANK &amp; TRUST</p>
            </div>
          </Link>
          <Link to="/login" className="text-sm text-blue-100 hover:text-white">
            Already activated? Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {!success && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#0f2b5b] grid place-items-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h1 className="font-serif text-3xl text-[#0f2b5b] mb-2">Activate Your Account</h1>
                <p className="text-gray-500 text-sm">
                  Enter your account number and the access code from your approval email.
                </p>
              </div>

              <div className="card p-8">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-5">
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      className="field font-mono text-lg text-center tracking-widest"
                      placeholder="3012345678"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      6-Digit Access Code
                    </label>
                    <input
                      type="text"
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="field font-mono text-lg text-center tracking-[0.5em]"
                      placeholder="••••••"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Activating…' : 'Activate Account'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-500 text-center leading-relaxed">
                  <p>
                    Code expired or never received?<br/>
                    Call <strong>1-800-CFB-BANK</strong> or email <strong>support@cfbank.com</strong>
                  </p>
                </div>
              </div>
            </>
          )}

          {success && (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 grid place-items-center mx-auto mb-4">
                <span className="text-3xl text-green-600">✓</span>
              </div>
              <h2 className="font-serif text-2xl text-[#0f2b5b] mb-2">Account Activated</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your account is now active. Redirecting you to sign in...
              </p>
              <Link to="/login" className="btn-primary inline-block w-full">
                Sign In Now
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Continental Federal Bank &amp; Trust. Member FDIC.</p>
          <div className="flex gap-4">
            <span>Member FDIC</span>
            <span>Equal Housing Lender</span>
          </div>
        </div>
      </footer>
    </div>
  );
}