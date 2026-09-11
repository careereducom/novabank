import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Small Business Owner — Boston, MA',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
      quote: 'Switching to Continental Federal was the best decision for my bakery. Their online banking saves me hours every week.',
    },
    {
      name: 'Carlos Mendoza',
      role: 'Freelance Designer — Guadalajara, MX',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
      quote: 'I transfer money between Mexico and the US without any hassle. Fees are transparent and transfers are instant.',
    },
    {
      name: 'Amelia Chen',
      role: 'Software Engineer — Toronto, CA',
      photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=faces',
      quote: 'The app is beautiful and simple. I opened my account in under 3 minutes and got a virtual card instantly.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* HEADER */}
      <header className="bg-[#0f2b5b] text-white sticky top-0 z-40">
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
          <Link to="/signup" className="hidden md:block bg-[#c9a227] hover:bg-[#a8861f] text-[#0f2b5b] px-4 py-2 rounded-md text-xs font-bold tracking-wide transition">
            OPEN AN ACCOUNT
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-[#0f2b5b] via-[#0a2148] to-[#0f2b5b] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-16">
          {/* Left — Marketing */}
          <div className="text-white">
            <p className="text-[#c9a227] text-xs font-bold tracking-[.3em] mb-5">
              SERVING CLIENTS SINCE 1989
            </p>
            <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
              Banking built on <span className="text-[#c9a227]">trust</span>,<br/>
              designed for <span className="text-[#c9a227]">you</span>.
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-lg">
              Join over 1.2 million customers across the United States, Canada, and Mexico
              who trust Continental Federal with their financial future.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/signup" className="bg-[#c9a227] hover:bg-[#a8861f] text-[#0f2b5b] font-bold py-3.5 px-8 rounded-md transition tracking-wide">
                Open an Account →
              </Link>
              <a href="#signin" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3.5 px-8 rounded-md transition">
                Sign In
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <p className="font-serif text-3xl font-bold text-[#c9a227]">$87M+</p>
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
          </div>

          {/* Right — Hero Image */}
          <div className="relative hidden md:block">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=900&fit=crop"
                alt="Happy customer"
                className="w-full h-[520px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-50 grid place-items-center">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Account opened</p>
                <p className="text-xs text-gray-500">in under 3 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🔒', title: '256-bit Encryption', sub: 'Bank-grade security' },
            { icon: '🏛', title: 'Member FDIC', sub: 'Insured up to $250,000' },
            { icon: '⚡', title: 'Instant Transfers', sub: 'Between CFB accounts' },
            { icon: '🌎', title: '3 Countries', sub: 'US · Canada · Mexico' },
          ].map(x => (
            <div key={x.title}>
              <p className="text-2xl mb-1">{x.icon}</p>
              <p className="font-bold text-[#0f2b5b] text-sm">{x.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{x.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SIGN-IN SECTION */}
      <section id="signin" className="bg-[#f4f6fa] py-16">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="font-serif text-3xl text-[#0f2b5b] mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to access your accounts</p>
          </div>

          <div className="card p-8 bg-white">
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="field pr-12"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0f2b5b] text-sm font-semibold">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
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
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#c9a227] text-xs font-bold tracking-[.3em] mb-3">TRUSTED BY MILLIONS</p>
            <h2 className="font-serif text-4xl text-[#0f2b5b] mb-3">What our customers say</h2>
            <p className="text-gray-500">Real people. Real banking. Real results.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(t => (
              <div key={t.name} className="card p-7">
                <div className="flex gap-1 mb-4 text-[#c9a227]">
                  {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-[#0f2b5b] text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-gradient-to-br from-[#0f2b5b] to-[#0a2148] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl mb-4">Ready to get started?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Open your Continental Federal account online in under three minutes.
            No monthly fees. Instant virtual card. FDIC insured.
          </p>
          <Link to="/signup" className="inline-block bg-[#c9a227] hover:bg-[#a8861f] text-[#0f2b5b] font-bold py-4 px-10 rounded-md transition tracking-wide">
            Open Your Account →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a1a3a] text-blue-200 py-10 text-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-white grid place-items-center">
                <span className="text-[#0f2b5b] font-serif font-bold text-base">CFB</span>
              </div>
              <div className="leading-tight">
                <p className="font-serif font-bold text-sm text-white">CONTINENTAL FEDERAL</p>
                <p className="text-[9px] tracking-[.25em] text-blue-300">BANK &amp; TRUST</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <span>Member FDIC</span>
              <span>Equal Housing Lender</span>
              <span>NMLS ID 447182</span>
              <span className="font-mono">SWIFT: CBFBUS33</span>
            </div>
          </div>
          <div className="border-t border-blue-900/50 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-300">
            <p>© {new Date().getFullYear()} Continental Federal Bank &amp; Trust. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Security</a>
              <a href="#" className="hover:text-white">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}