import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const COUNTRIES = ['United States', 'Canada', 'Mexico'];

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName:'', email:'', phone:'', password:'', dateOfBirth:'',
    addressLine1:'', addressLine2:'', city:'', state:'', postalCode:'',
    country:'United States', ssnLast4:'',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = k => e => setForm({ ...form, [k]: e.target.value });

  const next = () => {
    setErr('');
    if (step === 1) {
      if (!form.fullName || !form.email || !form.phone || !form.password || !form.dateOfBirth) {
        return setErr('Please complete all fields.');
      }
      if (form.password.length < 8) return setErr('Password must be at least 8 characters.');
    }
    if (step === 2) {
      if (!form.addressLine1 || !form.city || !form.state || !form.postalCode || !form.ssnLast4) {
        return setErr('Please complete your address and identity details.');
      }
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await apiFetch('/signup/start', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setResult(res);
      setStep(4);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">
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
          <Link to="/login" className="text-sm text-blue-100 hover:text-white">Already a customer? Sign In</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        {step <= 3 && (
          <>
            <div className="text-center mb-8">
              <h1 className="font-serif text-4xl text-[#0f2b5b] mb-2">Open your account</h1>
              <p className="text-gray-500">No monthly fees. Instant virtual card. FDIC insured.</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1,2,3].map(n => (
                <div key={n} className={`h-1.5 w-16 rounded-full ${step >= n ? 'bg-[#0f2b5b]' : 'bg-gray-200'}`}></div>
              ))}
            </div>
          </>
        )}

        <div className="card p-8">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-5">
              {err}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-serif text-xl text-[#0f2b5b]">Your details</h2>
              <input className="field" placeholder="Full legal name" value={form.fullName} onChange={set('fullName')} />
              <input className="field" type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
              <input className="field" placeholder="Phone number" value={form.phone} onChange={set('phone')} />
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Date of Birth</label>
                <input className="field" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
              <input className="field" type="password" placeholder="Create password (min 8 chars)" value={form.password} onChange={set('password')} />
              <button onClick={next} className="btn-primary w-full">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-serif text-xl text-[#0f2b5b]">Mailing address</h2>
              <input className="field" placeholder="Street address" value={form.addressLine1} onChange={set('addressLine1')} />
              <input className="field" placeholder="Apt, suite (optional)" value={form.addressLine2} onChange={set('addressLine2')} />
              <div className="grid grid-cols-2 gap-4">
                <input className="field" placeholder="City" value={form.city} onChange={set('city')} />
                <input className="field" placeholder="State / Province" value={form.state} onChange={set('state')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="field" placeholder="Postal code" value={form.postalCode} onChange={set('postalCode')} />
                <select className="field" value={form.country} onChange={set('country')}>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Last 4 of SSN / SIN / CURP
                </label>
                <input className="field font-mono" maxLength={4}
                  value={form.ssnLast4} onChange={e => setForm({ ...form, ssnLast4: e.target.value.replace(/\D/g,'') })} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3.5 rounded-md">Back</button>
                <button onClick={next} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-serif text-xl text-[#0f2b5b]">Review &amp; confirm</h2>
              <div className="bg-gray-50 rounded-lg p-5 text-sm space-y-2">
                <p><span className="text-gray-500">Name:</span> <strong>{form.fullName}</strong></p>
                <p><span className="text-gray-500">Email:</span> <strong>{form.email}</strong></p>
                <p><span className="text-gray-500">Phone:</span> <strong>{form.phone}</strong></p>
                <p><span className="text-gray-500">Address:</span> <strong>{form.addressLine1}, {form.city}, {form.state} {form.postalCode}, {form.country}</strong></p>
              </div>
              <p className="text-xs text-gray-500">
                By continuing you agree to our Deposit Agreement, Electronic Communications Consent,
                and Privacy Policy. Your information is protected with 256-bit encryption.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3.5 rounded-md">Back</button>
                <button onClick={submit} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                  {loading ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 grid place-items-center mx-auto">
                <span className="text-blue-600 text-3xl">⏳</span>
              </div>
              <h2 className="font-serif text-2xl text-[#0f2b5b]">Application Submitted</h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
                Thank you for opening an account with Continental Federal Bank &amp; Trust.
                Your application is now <strong className="text-gray-700">under review</strong>.
              </p>

              <div className="bg-gray-50 rounded-lg p-5 text-left space-y-3 text-sm max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Number</span>
                  <span className="font-mono font-bold">{result.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-bold text-amber-600">PENDING REVIEW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-700 text-xs truncate max-w-[200px]">{form.email}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left max-w-md mx-auto">
                <p className="text-sm font-bold text-blue-900 mb-2">What happens next?</p>
                <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                  <li>Our compliance team reviews your application (typically within 1 business day).</li>
                  <li>Once approved, you'll receive a <strong>6-digit access code</strong> by email.</li>
                  <li>Use your account number + access code to activate your account.</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-left max-w-md mx-auto">
                <p className="text-xs text-amber-900">
                  ⚠ A welcome email has been sent to <strong>{form.email}</strong>. Please check your inbox (and spam folder).
                </p>
              </div>

              <button onClick={() => navigate('/login')} className="btn-primary w-full max-w-md mx-auto">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}