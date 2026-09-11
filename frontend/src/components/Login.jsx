import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      login(data.token, data.user, data.accounts);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa]">
      <header className="bg-[#0f2b5b] text-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white grid place-items-center">
              <span className="text-[#0f2b5b] font-serif font-bold text-xl">CFB</span>
            </div>
            <div className="leading-tight">
              <p className="font-serif font-bold text-[15px] tracking-wide">CONTINENTAL FEDERAL</p>
              <p className="text-[10px] tracking-[.25em] text-blue-200">BANK &amp; TRUST</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-blue-100">
            <a href="#" className="hover:text-white">Personal</a>
            <a href="#" className="hover:text-white">Business</a>
            <a href="#" className="hover:text-white">Wealth</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-blue-200">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            Online Banking secure
          </div>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        <section className="hidden md:flex flex-col justify-center px-14 py-16 bg-gradient-to-br from-[#0f2b5b] to-[#0a2148] text-white">
          <p className="text-[#c9a227] text-xs font-bold tracking-[.3em] mb-5">
            SERVING CLIENTS SINCE 1989
          </p>
          <h1 className="font-serif text-5xl leading-[1.1] mb-6">
            Banking built on <span className="text-[#c9a227]">trust</span>,<br/>
            engineered for you.
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-10 max-w-md">
            Continental Federal Bank &amp; Trust has served over 1.2 million customers
            across the United States, Canada, and Mexico. Protected by 256-bit
            encryption and multi-layer authentication.
          </p>

          <div className="grid grid-cols-3 gap-6 max-w-md">
            <div>
              <p className="font-serif text-3xl font-bold text-[#c9a227]">$87M</p>
              <p className="text-blue-200 text-xs mt-1 tracking-wide">UNDER MANAGEMENT</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-[#c9a227]">36</p>
              <p className="text-blue-200 text-xs mt-1 tracking-wide">YEARS SERVING</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-[#c9a227]">FDIC</p>
              <p className="text-blue-200 text-xs mt-1 tracking-wide">INSURED</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/15 flex items-center gap-5 text-xs text-blue-200">
            <span className="flex items-center gap-2">🔒 256-bit TLS encryption</span>
            <span className="flex items-center gap-2">✓ Member FDIC</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="md:hidden w-14 h-14 rounded-md bg-[#0f2b5b] grid place-items-center mx-auto mb-4">
                <span className="text-white font-serif font-bold text-2xl">CFB</span>
              </div>
              <h2 className="font-serif text-3xl text-[#0f2b5b] mb-2">Welcome back</h2>
              <p className="text-gray-500 text-sm">Sign in to access your accounts</p>
            </div>

            <div className="card p-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-5" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="field"
                    placeholder="Enter your account number"
                    autoComplete="username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="field"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 accent-[#0f2b5b]"
                    />
                    Remember username
                  </label>
                  <a href="#" className="text-[#0f2b5b] font-semibold hover:underline">
                    Forgot password?
                  </a>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <div className="text-center text-xs text-gray-400 pt-1">
                  🔒 Secured with 256-bit encryption
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 mb-3">New to Continental Federal?</p>
                <Link to="/signup"
                  className="block w-full border-2 border-[#0f2b5b] text-[#0f2b5b] font-bold py-3 rounded-md hover:bg-[#0f2b5b] hover:text-white transition text-center">
                  Open an Account in 3 Minutes
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
              By signing in you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Continental Federal Bank &amp; Trust. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>Member FDIC</span>
            <span>Equal Housing Lender</span>
            <span>NMLS ID 447182</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
