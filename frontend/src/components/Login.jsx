import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import LiveChat from './LiveChat';

const HERO_VIDEO = 'https://cdn.pixabay.com/video/2020/05/25/40130-424930032_large.mp4';
const HERO_POSTER = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80';

export default function Login() {
  const [step, setStep] = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [errorType, setErrorType] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const [stageToken, setStageToken] = useState('');
  const [destination, setDestination] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setErrorType(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (data.otpRequired) {
        setStageToken(data.stageToken);
        setDestination(data.destination);
        setStep('otp');
      }
    } catch (err) {
      // Detect pending/rejected status
      if (err.message === 'ACCOUNT_PENDING') {
        setErrorType('PENDING');
        setError('Your application is under review. You\'ll receive an access code by email once approved.');
      } else if (err.message === 'ACCOUNT_REJECTED') {
        setErrorType('REJECTED');
        setError('Your application was declined. Please contact support for details.');
      } else if (err.message === 'ACCOUNT_INACTIVE') {
        setErrorType('INACTIVE');
        setError('Your account is not yet active. Please activate using your access code.');
      } else {
        setError(err.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the 6-digit code');
    setError(''); setOtpLoading(true);
    try {
      const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ stageToken, code })
      });
      login(data.token, data.user, data.accounts);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const testimonials = [
    { name: 'Sarah Mitchell', role: 'Small Business Owner — Boston, MA',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
      quote: 'Switching to Continental Federal was the best decision for my bakery. Their online banking saves me hours every week.' },
    { name: 'Carlos Mendoza', role: 'Freelance Designer — Guadalajara, MX',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
      quote: 'I transfer money between Mexico and the US without any hassle. Fees are transparent and transfers are instant.' },
    { name: 'Amelia Chen', role: 'Software Engineer — Toronto, CA',
      photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=faces',
      quote: 'The app is beautiful and simple. I opened my account in under 3 minutes and got a virtual card instantly.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
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

      <section className="relative overflow-hidden">
        <video autoPlay muted loop playsInline preload="auto" poster={HERO_POSTER}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}>
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2b5b]/95 via-[#0a2148]/90 to-[#0f2b5b]/75"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-20">
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
              <button onClick={() => setShowVideo(true)}
                className="flex items-center gap-2 text-white font-semibold py-3.5 px-6 rounded-md hover:bg-white/10 transition border border-transparent">
                <span className="w-9 h-9 rounded-full bg-white/20 grid place-items-center text-sm">▶</span>
                Watch our story
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <p className="font-serif text-3xl font-bold text-[#c9a227]">$90M</p>
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

          <div className="relative hidden md:block">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=900&fit=crop"
                alt="Happy customer" className="w-full h-[520px] object-cover" />
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

      <section id="signin" className="bg-[#f4f6fa] py-16">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="font-serif text-3xl text-[#0f2b5b] mb-2">
              {step === 'credentials' ? 'Welcome back' : 'Verify your identity'}
            </h2>
            <p className="text-gray-500 text-sm">
              {step === 'credentials'
                ? 'Sign in to access your accounts'
                : 'Enter the verification code sent to your registered device'}
            </p>
          </div>

          <div className="card p-8 bg-white">
            {error && (
              <div className={`border px-4 py-3 rounded-md text-sm mb-5 ${
                errorType === 'PENDING'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : errorType === 'REJECTED'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {errorType === 'PENDING' && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">⏳</span>
                    <div>
                      <p className="font-bold">Application Under Review</p>
                      <p className="mt-1 text-xs">{error}</p>
                    </div>
                  </div>
                )}
                {errorType === 'REJECTED' && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">✕</span>
                    <div>
                      <p className="font-bold">Application Declined</p>
                      <p className="mt-1 text-xs">{error}</p>
                    </div>
                  </div>
                )}
                {errorType === 'INACTIVE' && (
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">🔐</span>
                    <div>
                      <p className="font-bold">Account Not Active</p>
                      <p className="mt-1 text-xs">{error}</p>
                      <Link to="/activate" className="inline-block mt-2 text-xs font-bold text-[#0f2b5b] underline">
                        Activate your account →
                      </Link>
                    </div>
                  </div>
                )}
                {!errorType && error}
              </div>
            )}

            {step === 'credentials' && (
              <form onSubmit={submit} className="space-y-5" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="field" placeholder="Enter your account number" autoComplete="username" required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="field pr-12" placeholder="Enter password"
                      autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0f2b5b] text-sm font-semibold">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 accent-[#0f2b5b]" />
                    Remember username
                  </label>
                  <a href="#" className="text-[#0f2b5b] font-semibold hover:underline">Forgot password?</a>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Verifying…' : 'Sign In'}
                </button>

                <div className="text-center text-xs text-gray-400 pt-1">
                  🔒 Secured with 256-bit encryption
                </div>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                  <p className="text-blue-900 font-bold mb-1">🔐 Two-Factor Authentication</p>
                  <p className="text-blue-800 text-xs">
                    A 6-digit code has been sent to <strong>{destination}</strong>. It expires in 5 minutes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, idx) => (
                      <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" maxLength={1}
                        value={digit} onChange={e => handleOtpChange(idx, e.target.value)}
                        className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-md focus:border-[#0f2b5b] focus:ring-2 focus:ring-[#0f2b5b]/20 outline-none" />
                    ))}
                  </div>
                </div>

                <button onClick={verifyOtp} disabled={otpLoading || otp.join('').length !== 6}
                  className="btn-primary w-full disabled:opacity-50">
                  {otpLoading ? 'Verifying…' : 'Verify & Sign In'}
                </button>

                <div className="flex justify-between text-xs text-gray-500">
                  <button onClick={() => { setStep('credentials'); setOtp(['','','','','','']); setError(''); setErrorType(''); }}
                    className="hover:text-[#0f2b5b] font-semibold">← Back</button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
              <p className="text-sm text-gray-600">New to Continental Federal?</p>
              <Link to="/signup"
                className="block w-full border-2 border-[#0f2b5b] text-[#0f2b5b] font-bold py-3 rounded-md hover:bg-[#0f2b5b] hover:text-white transition text-center">
                Open an Account in 3 Minutes
              </Link>
              <Link to="/activate"
                className="block w-full text-[#0f2b5b] font-semibold py-2 text-sm hover:underline">
                Already approved? Activate your account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#c9a227] text-xs font-bold tracking-[.3em] mb-3">MOBILE BANKING</p>
            <h2 className="font-serif text-4xl text-[#0f2b5b] mb-5">Your bank, in your pocket.</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Transfer funds, deposit checks, pay bills, and manage your cards —
              all from our award-winning mobile experience. Available on iOS and Android.
            </p>
            <div className="space-y-4 mb-8">
              {[
                'Instant transfers between CFB accounts',
                'Mobile check deposit with photo capture',
                'Real-time notifications & alerts',
                'Face ID and fingerprint login',
              ].map(f => (
                <div key={f} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm grid place-items-center font-bold flex-shrink-0">✓</span>
                  <span className="text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="bg-black text-white px-5 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition">
                <span className="text-2xl">🍎</span>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-gray-300">Download on the</div>
                  <div className="font-bold text-sm">App Store</div>
                </div>
              </button>
              <button className="bg-black text-white px-5 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition">
                <span className="text-2xl">▶</span>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-gray-300">Get it on</div>
                  <div className="font-bold text-sm">Google Play</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="w-[320px] h-[640px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
                <div className="w-full h-full bg-gradient-to-br from-[#0f2b5b] via-[#0a2148] to-[#0f2b5b] rounded-[2.5rem] overflow-hidden relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
                  <div className="pt-8 px-6 flex justify-between text-white text-[10px] tracking-wider">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span>●●●</span>
                      <span>▮</span>
                    </div>
                  </div>
                  <div className="px-5 pt-3 text-white">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-[#c9a227] grid place-items-center font-bold text-[#0f2b5b] text-xs font-serif">CFB</div>
                        <div className="leading-tight">
                          <p className="text-[9px] tracking-[.2em] text-blue-200">CONTINENTAL</p>
                          <p className="text-[9px] tracking-[.2em] text-blue-200">FEDERAL</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">
                        <span className="text-sm">🔔</span>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-5 mb-4 backdrop-blur border border-white/10">
                      <p className="text-[10px] text-blue-200 uppercase tracking-[.2em]">Total Balance</p>
                      <p className="font-serif text-3xl font-bold mt-2 tracking-tight">$ •••• ••••</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        <p className="text-[10px] text-blue-200">Account secured · FDIC insured</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {[{i:'↗',l:'Send'},{i:'⬇',l:'Deposit'},{i:'⌂',l:'Bills'},{i:'≡',l:'More'}].map((x, idx) => (
                        <div key={idx} className="aspect-square bg-white/10 rounded-xl grid place-items-center">
                          <div className="text-center">
                            <p className="text-lg">{x.i}</p>
                            <p className="text-[8px] text-blue-200 mt-0.5">{x.l}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] text-blue-200 uppercase tracking-[.2em]">Recent</p>
                      <p className="text-[10px] text-[#c9a227]">See all →</p>
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5">
                        <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">
                          <div className="w-3 h-3 rounded-full bg-white/30"></div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                          <div className="h-1.5 bg-white/10 rounded-full w-1/2"></div>
                        </div>
                        <div className="w-14 h-3 bg-white/20 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur border-t border-white/10 px-6 py-3 flex justify-around">
                    {['⌂','↗','📊','⚙'].map((i, x) => (
                      <span key={x} className={`text-lg ${x === 0 ? 'text-[#c9a227]' : 'text-blue-300'}`}>{i}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 top-24 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-2 border border-gray-100">
                <span className="w-9 h-9 rounded-full bg-green-50 grid place-items-center text-green-600 text-lg">✓</span>
                <div className="text-xs">
                  <p className="font-bold text-gray-800">Money sent</p>
                  <p className="text-gray-500">Just now</p>
                </div>
              </div>
              <div className="absolute -left-8 bottom-32 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-2 border border-gray-100">
                <span className="w-9 h-9 rounded-full bg-blue-50 grid place-items-center text-blue-600 text-lg">🔒</span>
                <div className="text-xs">
                  <p className="font-bold text-gray-800">256-bit</p>
                  <p className="text-gray-500">Secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f6fa] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#c9a227] text-xs font-bold tracking-[.3em] mb-3">TRUSTED BY MILLIONS</p>
            <h2 className="font-serif text-4xl text-[#0f2b5b] mb-3">What our customers say</h2>
            <p className="text-gray-500">Real people. Real banking. Real results.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(t => (
              <div key={t.name} className="card p-7 bg-white">
                <div className="flex gap-1 mb-4 text-[#c9a227]">
                  {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
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

      <LiveChat />

      {showVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
             onClick={() => setShowVideo(false)}>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-3">
              <button onClick={() => setShowVideo(false)}
                className="text-white hover:text-[#c9a227] font-bold text-3xl leading-none">
                ×
              </button>
            </div>
            <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
              <video autoPlay controls className="w-full" poster={HERO_POSTER}>
                <source src={HERO_VIDEO} type="video/mp4" />
              </video>
            </div>
            <p className="text-center text-white/70 text-sm mt-4">
              Continental Federal Bank &amp; Trust · Est. 1989
            </p>
          </div>
        </div>
      )}
    </div>
  );
}