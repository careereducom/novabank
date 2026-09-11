import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Cards() {
  const { token, accounts, user } = useAuth();
  const [cards, setCards] = useState([]);
  const [showOrder, setShowOrder] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  const [form, setForm] = useState({
    accountId: accounts[0]?.id || '',
    shippingLine1: user?.addressLine1 || '',
    shippingLine2: user?.addressLine2 || '',
    shippingCity: user?.city || '',
    shippingState: user?.state || '',
    shippingZip: user?.postalCode || '',
    shippingCountry: user?.country || 'United States',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => apiFetch('/cards', {}, token).then(setCards).catch(() => {});
  useEffect(() => { load(); }, [token]);

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const order = async () => {
    setErr(''); setMsg('');
    try {
      const res = await apiFetch('/cards/order-physical', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token);
      setMsg(res.message);
      setShowOrder(false);
      load();
    } catch (e) { setErr(e.message); }
  };

  const freeze = async (id) => {
    await apiFetch(`/cards/${id}/freeze`, { method: 'POST' }, token);
    load();
  };

  const CardVisual = ({ c }) => (
    <div className="relative rounded-2xl p-6 text-white shadow-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f2b5b 0%, #1a3d7a 50%, #0a2148 100%)',
        aspectRatio: '1.586 / 1',
        minHeight: '210px',
      }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[10px] tracking-[.3em] text-blue-200">CONTINENTAL FEDERAL</p>
          <p className="text-[9px] tracking-[.25em] text-blue-300">BANK &amp; TRUST</p>
        </div>
        <span className="text-xs font-bold tracking-widest">{c.brand}</span>
      </div>

      <p className="font-mono text-lg md:text-xl tracking-widest mb-6">
        {c.cardNumber
          ? c.cardNumber.replace(/(.{4})/g, '$1 ').trim()
          : `•••• •••• •••• ${c.last4}`}
      </p>

      <div className="flex justify-between items-end text-xs">
        <div>
          <p className="text-blue-200 text-[9px] tracking-wider">CARDHOLDER</p>
          <p className="font-mono">{c.holderName}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-200 text-[9px] tracking-wider">EXPIRES</p>
          <p className="font-mono">{String(c.expiryMonth).padStart(2, '0')}/{String(c.expiryYear).slice(-2)}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-200 text-[9px] tracking-wider">CVV</p>
          <p className="font-mono">{c.cvv || '•••'}</p>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          c.status === 'ACTIVE' ? 'bg-green-400 text-green-900' :
          c.status === 'SHIPPED' ? 'bg-amber-400 text-amber-900' :
          c.status === 'FROZEN' ? 'bg-blue-300 text-blue-900' :
          'bg-gray-300 text-gray-800'
        }`}>{c.status}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#0f2b5b]">Cards</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your virtual and physical cards</p>
        </div>
        {!cards.find(c => c.type === 'PHYSICAL') && (
          <button onClick={() => setShowOrder(true)} className="btn-primary text-sm py-2.5">
            Order Physical Card
          </button>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mb-5">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-5">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(c => (
          <div key={c.id} className="space-y-4">
            <CardVisual c={c} />

            {c.type === 'VIRTUAL' && !showDetails[c.id] && (
              <button onClick={() => setShowDetails({ ...showDetails, [c.id]: true })}
                className="w-full border border-gray-300 hover:border-[#0f2b5b] text-gray-700 hover:text-[#0f2b5b] font-semibold py-2.5 rounded-md text-sm transition">
                Show Card Details
              </button>
            )}

            {c.type === 'PHYSICAL' && c.status === 'SHIPPED' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-bold text-blue-900 mb-1">📦 Card shipped</p>
                <p className="text-blue-800">Carrier: {c.carrier}</p>
                <p className="text-blue-800">Tracking: <span className="font-mono">{c.trackingNumber}</span></p>
                <p className="text-blue-800">ETA: {new Date(c.estimatedDelivery).toLocaleDateString('en-US', { month:'long', day:'numeric' })}</p>
                <p className="text-xs text-blue-700 mt-2">Ship to: {c.shippingLine1}, {c.shippingCity}, {c.shippingState} {c.shippingZip}</p>
              </div>
            )}

            <button onClick={() => freeze(c.id)}
              className="w-full border border-gray-300 hover:border-[#0f2b5b] text-gray-700 hover:text-[#0f2b5b] font-semibold py-2.5 rounded-md text-sm transition">
              {c.status === 'FROZEN' ? 'Unfreeze Card' : 'Freeze Card'}
            </button>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <p className="card p-8 text-center text-gray-500">No cards on file.</p>
      )}

      {showOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-2xl text-[#0f2b5b] mb-1">Order a Physical Card</h2>
            <p className="text-sm text-gray-500 mb-5">Delivered in 3–5 business days.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Linked Account</label>
                <select className="field" value={form.accountId}
                  onChange={e => setForm({ ...form, accountId: e.target.value })}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} — {money(a.balance)}</option>)}
                </select>
              </div>
              <input className="field" placeholder="Street address" value={form.shippingLine1}
                onChange={e => setForm({ ...form, shippingLine1: e.target.value })} />
              <input className="field" placeholder="Apt, suite (optional)" value={form.shippingLine2}
                onChange={e => setForm({ ...form, shippingLine2: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="field" placeholder="City" value={form.shippingCity}
                  onChange={e => setForm({ ...form, shippingCity: e.target.value })} />
                <input className="field" placeholder="State / Province" value={form.shippingState}
                  onChange={e => setForm({ ...form, shippingState: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="field" placeholder="Postal code" value={form.shippingZip}
                  onChange={e => setForm({ ...form, shippingZip: e.target.value })} />
                <select className="field" value={form.shippingCountry}
                  onChange={e => setForm({ ...form, shippingCountry: e.target.value })}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Mexico</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowOrder(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-md">
                Cancel
              </button>
              <button onClick={order} className="btn-primary flex-1">Confirm Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
