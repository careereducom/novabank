import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const US_BANKS = [
  { name: 'JPMorgan Chase Bank, New York, NY', routing: '021000021' },
  { name: 'Bank of America, Charlotte, NC', routing: '026009593' },
  { name: 'Wells Fargo Bank, San Francisco, CA', routing: '121000248' },
  { name: 'Citibank, New York, NY', routing: '021000089' },
  { name: 'PNC Bank, Pittsburgh, PA', routing: '031000503' },
  { name: 'Capital One, McLean, VA', routing: '051000017' },
  { name: 'U.S. Bank, Minneapolis, MN', routing: '091000019' },
  { name: 'KeyBank, Cleveland, OH', routing: '124003116' },
  { name: 'Navy Federal Credit Union, Vienna, VA', routing: '256074974' },
  { name: 'TD Bank, Cherry Hill, NJ', routing: '021214891' },
  { name: 'Fifth Third Bank, Cincinnati, OH', routing: '042000013' },
  { name: 'Regions Bank, Birmingham, AL', routing: '062000019' },
  { name: 'BMO Harris Bank, Chicago, IL', routing: '071000013' },
  { name: 'Huntington National Bank, Columbus, OH', routing: '041000014' },
  { name: 'M&T Bank, Buffalo, NY', routing: '031100089' },
  { name: 'Comerica Bank, Dallas, TX', routing: '072000326' },
  { name: 'Frost Bank, San Antonio, TX', routing: '114000093' },
  { name: 'Zions Bancorporation, Salt Lake City, UT', routing: '122105155' },
];

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState('applications');
  const [apps, setApps] = useState([]);
  const [approvedApps, setApprovedApps] = useState([]);
  const [rejectedApps, setRejectedApps] = useState([]);
  const [txns, setTxns] = useState([]);
  const [deps, setDeps] = useState([]);
  const [creds, setCreds] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [toast, setToast] = useState('');

  // Reject modal
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Approve result modal
  const [approveResult, setApproveResult] = useState(null);

  // Beneficiary modal
  const [showBenModal, setShowBenModal] = useState(false);
  const [benEditing, setBenEditing] = useState(null);
  const emptyBen = { accountNumber: '', routingNumber: '', accountName: '', bankName: '', accountType: 'checking', customerId: '', description: '' };
  const [benForm, setBenForm] = useState(emptyBen);
  const [benError, setBenError] = useState('');
  const [benSaving, setBenSaving] = useState(false);
  const [benSearch, setBenSearch] = useState('');

  const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stamp = iso => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [a, ap, rj, t, d, c, b] = await Promise.all([
        apiFetch('/admin/applications', {}, token),
        apiFetch('/admin/applications/approved', {}, token),
        apiFetch('/admin/applications/rejected', {}, token),
        apiFetch('/admin/pending', {}, token),
        apiFetch('/admin/deposits/pending', {}, token),
        apiFetch('/admin/credentials', {}, token),
        apiFetch('/beneficiaries', {}, token),
      ]);
      setApps(a); setApprovedApps(ap); setRejectedApps(rj);
      setTxns(t); setDeps(d); setCreds(c); setBeneficiaries(b);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  // ═══════════════ ACTIONS ═══════════════

  const approve = async (id, name) => {
    if (!confirm(`Approve application from ${name}?`)) return;
    try {
      const res = await apiFetch(`/admin/applications/${id}/approve`, { method: 'POST' }, token);
      setApproveResult({ ...res, applicantName: name });
      load();
      flash('✓ Application approved');
    } catch (e) { flash('✗ ' + e.message); }
  };

  const openReject = (id) => { setRejectId(id); setRejectReason(''); };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return flash('Enter a reason');
    setRejecting(true);
    try {
      await apiFetch(`/admin/applications/${rejectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      }, token);
      setRejectId(null); setRejectReason('');
      load();
      flash('✓ Application rejected.');
    } catch (e) { flash('✗ ' + e.message); }
    finally { setRejecting(false); }
  };

  const act = async (path) => {
    try { await apiFetch(path, { method: 'POST' }, token); load(); flash('✓ Done'); }
    catch (e) { flash('✗ ' + e.message); }
  };

  const copyAll = () => {
    const text = creds.map(c =>
      `${c.accountName}\n  Username : ${c.username}\n  Password : ${c.password}\n  Code     : ${c.transferCode}\n  Balance  : ${money(c.balance)}\n`
    ).join('\n');
    navigator.clipboard.writeText(text);
    flash('✓ Credentials copied');
  };

  // ═══════════════ BENEFICIARY HANDLERS ═══════════════

  const openAddBen = () => {
    setBenEditing(null);
    setBenForm(emptyBen);
    setBenError('');
    setShowBenModal(true);
  };

  const openEditBen = (b) => {
    setBenEditing(b);
    setBenForm({
      accountNumber: b.accountNumber,
      routingNumber: b.routingNumber,
      accountName: b.accountName,
      bankName: b.bankName,
      accountType: b.accountType || 'checking',
      customerId: b.customerId || '',
      description: b.description || '',
    });
    setBenError('');
    setShowBenModal(true);
  };

  const saveBen = async () => {
    setBenError('');
    if (!benForm.accountNumber.trim()) return setBenError('Account number required');
    if (!benForm.routingNumber.trim()) return setBenError('Routing number required');
    if (!benForm.accountName.trim()) return setBenError('Account holder name required');
    if (!benForm.bankName.trim()) return setBenError('Bank name required');
    if (!/^\d{6,17}$/.test(benForm.accountNumber)) return setBenError('Account number must be 6-17 digits');
    if (!/^\d{9}$/.test(benForm.routingNumber)) return setBenError('Routing number must be exactly 9 digits');

    setBenSaving(true);
    try {
      if (benEditing) {
        await apiFetch(`/beneficiaries/${benEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify(benForm),
        }, token);
        flash('✓ Beneficiary updated');
      } else {
        await apiFetch('/beneficiaries', {
          method: 'POST',
          body: JSON.stringify(benForm),
        }, token);
        flash('✓ Beneficiary added');
      }
      setShowBenModal(false);
      load();
    } catch (e) { setBenError(e.message); }
    finally { setBenSaving(false); }
  };

  const deleteBen = async (b) => {
    if (!confirm(`Remove ${b.accountName} from directory?`)) return;
    try {
      await apiFetch(`/beneficiaries/${b.id}`, { method: 'DELETE' }, token);
      load();
      flash('✓ Beneficiary removed');
    } catch (e) { flash('✗ ' + e.message); }
  };

  const onBankSelect = (bankName) => {
    const bank = US_BANKS.find(b => b.name === bankName);
    setBenForm({ ...benForm, bankName, routingNumber: bank?.routing || benForm.routingNumber });
  };

  const filteredBen = beneficiaries.filter(b => {
    if (!benSearch.trim()) return true;
    const s = benSearch.toLowerCase();
    return b.accountName.toLowerCase().includes(s) ||
           b.accountNumber.includes(s) ||
           b.bankName.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#0f2b5b]">Operations Console</h1>
          <p className="text-gray-500 text-sm mt-1">Institutional controls and client registry</p>
        </div>
        {toast && (
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {toast}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('applications')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'applications' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          📋 Applications
          {apps.length > 0 && (
            <span className="ml-2 bg-[#b1122b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {apps.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('beneficiaries')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'beneficiaries' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          🏦 Beneficiaries ({beneficiaries.length})
        </button>
        <button onClick={() => setTab('credentials')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'credentials' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          🔐 Client Registry
        </button>
        <button onClick={() => setTab('transfers')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'transfers' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Pending Transfers ({txns.length})
        </button>
        <button onClick={() => setTab('deposits')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'deposits' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Pending Deposits ({deps.length})
        </button>
        <button onClick={() => setTab('approved')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'approved' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Approved ({approvedApps.length})
        </button>
        <button onClick={() => setTab('rejected')}
          className={`px-5 py-2.5 rounded-md font-semibold text-sm transition ${tab === 'rejected' ? 'bg-[#0f2b5b] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
          Rejected ({rejectedApps.length})
        </button>
      </div>

      {/* ═══════════════ APPLICATIONS TAB ═══════════════ */}
      {!loading && tab === 'applications' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-blue-900 mb-1">📋 New Account Applications</p>
            <p className="text-sm text-blue-800">
              Review applications and approve or reject. Approved applicants receive a 6-digit access code by email.
            </p>
          </div>

          {apps.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-gray-500">No pending applications.</p>
            </div>
          )}

          <div className="space-y-4">
            {apps.map(app => (
              <div key={app.id} className="card p-6">
                <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[250px]">
                    <p className="font-bold text-gray-800 text-lg">{app.fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      #{app.username} · Submitted {stamp(app.createdAt)}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                    PENDING
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Email:</span> <strong>{app.email}</strong></p>
                    <p><span className="text-gray-500">Phone:</span> <strong>{app.phone}</strong></p>
                    <p><span className="text-gray-500">DOB:</span> {app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString() : '—'}</p>
                    <p><span className="text-gray-500">SSN Last 4:</span> <span className="font-mono">•••• {app.ssnLast4 || '—'}</span></p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Address:</span> {app.addressLine1}{app.addressLine2 ? ', ' + app.addressLine2 : ''}</p>
                    <p className="text-xs text-gray-500">{app.city}, {app.state} {app.postalCode}, {app.country}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Signup Location & Device
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Signup IP</p>
                      <p className="font-mono text-gray-800 mt-0.5">{app.signupIp || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Geolocation</p>
                      <p className="text-gray-800 mt-0.5 font-semibold">{app.signupLocation || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Device</p>
                      <p className="text-gray-800 mt-0.5 truncate" title={app.signupUserAgent || ''}>
                        {app.signupUserAgent ? app.signupUserAgent.slice(0, 40) + '…' : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => approve(app.id, app.fullName)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md transition">
                    ✓ Approve Application
                  </button>
                  <button onClick={() => openReject(app.id)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-md transition">
                    ✕ Reject Application
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ BENEFICIARIES TAB ═══════════════ */}
      {!loading && tab === 'beneficiaries' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="max-w-2xl">
                <p className="font-bold text-blue-900 mb-1">🏦 Verified External Beneficiary Directory</p>
                <p className="text-sm text-blue-800">
                  Pre-verified external accounts (vendors, contractors, partner institutions).
                  When a user enters one of these accounts on a transfer, the system shows
                  the pre-verified name and bank — matching real bank name enquiry.
                </p>
              </div>
              <button onClick={openAddBen}
                className="bg-[#0f2b5b] hover:bg-[#0a2148] text-white font-bold px-5 py-3 rounded-md transition">
                + Add Beneficiary
              </button>
            </div>
          </div>

          <div className="card p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">🔍</span>
              <input type="text" value={benSearch} onChange={e => setBenSearch(e.target.value)}
                placeholder="Search by name, account, or bank..."
                className="flex-1 outline-none text-sm py-1 bg-transparent" />
              {benSearch && (
                <button onClick={() => setBenSearch('')} className="text-xs text-gray-500 hover:text-gray-700">
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredBen.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">🏦</p>
              <p className="text-gray-500 mb-2">
                {beneficiaries.length === 0
                  ? 'No beneficiaries in directory yet.'
                  : 'No results match your search.'}
              </p>
              {beneficiaries.length === 0 && (
                <button onClick={openAddBen} className="btn-primary mt-4">
                  + Add First Beneficiary
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBen.map(b => (
              <div key={b.id} className="card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{b.accountName}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{b.accountNumber}</p>
                  </div>
                  {b.isVerified && (
                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">
                      ✓ VERIFIED
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span className="text-gray-800 font-semibold truncate max-w-[180px] text-right">
                      {b.bankName.split(',')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Routing</span>
                    <span className="font-mono text-gray-800">{b.routingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="text-gray-700 capitalize">{b.accountType}</span>
                  </div>
                  {b.customerId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer ID</span>
                      <span className="font-mono text-gray-700 text-xs">{b.customerId}</span>
                    </div>
                  )}
                  {b.description && (
                    <div className="text-xs text-gray-500 pt-1">{b.description}</div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEditBen(b)}
                    className="flex-1 border border-gray-300 hover:border-[#0f2b5b] hover:text-[#0f2b5b] text-gray-700 font-semibold text-xs py-2 rounded-md transition">
                    Edit
                  </button>
                  <button onClick={() => deleteBen(b)}
                    className="border border-gray-300 hover:border-red-500 hover:text-red-600 text-gray-500 font-semibold text-xs py-2 px-3 rounded-md transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ CREDENTIALS TAB ═══════════════ */}
      {!loading && tab === 'credentials' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="max-w-2xl">
                <p className="font-bold text-blue-900 mb-1">🔐 Client Registry — Internal</p>
                <p className="text-sm text-blue-800">
                  Credentials for all registered account holders. Access restricted to authorized staff.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReveal(!reveal)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm transition">
                  {reveal ? '🙈 Mask Codes' : '👁 View Codes'}
                </button>
                <button onClick={copyAll}
                  className="bg-white hover:bg-gray-50 border border-blue-300 text-blue-900 px-4 py-2 rounded-md font-semibold text-sm transition">
                  📋 Export
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creds.map(c => (
              <div key={c.accountNumber} className="card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{c.accountName}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.accountNumber}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{money(c.balance)}</p>
                </div>
                <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Username</span>
                    <span className="font-mono font-semibold text-gray-800">{c.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Password</span>
                    <span className="font-mono font-semibold text-gray-800">{c.password}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Transfer Code</span>
                    <span className="font-mono font-bold tracking-widest text-[#b1122b]">
                      {reveal ? c.transferCode : '••••'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ TRANSFERS TAB ═══════════════ */}
      {!loading && tab === 'transfers' && (
        <div className="space-y-3">
          {txns.length === 0 && <p className="card p-8 text-center text-gray-500">No pending transfers</p>}
          {txns.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">
                    {t.fromAccount.accountName} → {t.toAccount?.accountName || 'External Beneficiary'}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{t.reference} · {stamp(t.createdAt)}</p>
                  <p className="text-xs text-gray-500 font-mono">To: {t.toAccount?.accountNumber || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-2">{t.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{money(t.amount)}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => act(`/admin/transfers/${t.id}/approve`)}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md text-sm">
                      Approve
                    </button>
                    <button onClick={() => act(`/admin/transfers/${t.id}/reject`)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md text-sm">
                      Reject &amp; Refund
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════ DEPOSITS TAB ═══════════════ */}
      {!loading && tab === 'deposits' && (
        <div className="space-y-3">
          {deps.length === 0 && <p className="card p-8 text-center text-gray-500">No pending check deposits</p>}
          {deps.map(d => (
            <div key={d.id} className="card p-5 flex flex-wrap gap-4">
              <img src={d.checkImage} alt="Check" className="w-40 h-28 object-cover rounded-lg border border-gray-200" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-lg">{money(d.amount)}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{d.reference} · {stamp(d.createdAt)}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => act(`/admin/deposits/${d.id}/approve`)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md text-sm">
                  Approve
                </button>
                <button onClick={() => act(`/admin/deposits/${d.id}/reject`)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-md text-sm">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════ APPROVED TAB ═══════════════ */}
      {!loading && tab === 'approved' && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-green-900 mb-1">✓ Approved — Awaiting Activation</p>
            <p className="text-sm text-green-800">
              These applicants received access codes but haven't activated yet.
            </p>
          </div>
          {approvedApps.length === 0 && (
            <div className="card p-12 text-center"><p className="text-gray-500">No approved-but-inactive applications.</p></div>
          )}
          <div className="space-y-3">
            {approvedApps.map(app => (
              <div key={app.id} className="card p-5 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-gray-800">{app.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">#{app.username} · {app.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Approved {stamp(app.approvedAt)} · Code expires {stamp(app.accessCodeExpiry)}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                  AWAITING ACTIVATION
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ REJECTED TAB ═══════════════ */}
      {!loading && tab === 'rejected' && (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-red-900 mb-1">✕ Rejected Applications</p>
            <p className="text-sm text-red-800">Applicants who were declined and notified by email.</p>
          </div>
          {rejectedApps.length === 0 && (
            <div className="card p-12 text-center"><p className="text-gray-500">No rejected applications.</p></div>
          )}
          <div className="space-y-3">
            {rejectedApps.map(app => (
              <div key={app.id} className="card p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-gray-800">{app.fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">#{app.username} · {app.email}</p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">REJECTED</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Reason:</strong> {app.rejectedReason || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stamp(app.approvedAt || app.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ REJECT MODAL ═══════════════ */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-2">Reject Application</h3>
            <p className="text-sm text-gray-500 mb-5">
              Provide a reason. The applicant will receive this in their rejection email.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="field" rows="4" placeholder="e.g. Unable to verify identity documents" autoFocus />
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition">
                Cancel
              </button>
              <button onClick={confirmReject} disabled={rejecting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition disabled:opacity-50">
                {rejecting ? 'Rejecting…' : 'Reject & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ APPROVE RESULT MODAL ═══════════════ */}
      {approveResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 grid place-items-center mx-auto mb-3">
                <span className="text-green-600 text-3xl">✓</span>
              </div>
              <h3 className="font-serif text-xl text-[#0f2b5b]">Application Approved</h3>
              <p className="text-sm text-gray-500 mt-1">
                {approveResult.applicantName} has been emailed their access code.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-mono text-gray-800 text-xs">{approveResult.email}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                <span className="text-gray-500">Access Code</span>
                <span className="font-mono font-bold text-[#b1122b] text-lg tracking-widest">
                  {approveResult.accessCode}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Expires</span>
                <span className="text-gray-600">{stamp(approveResult.expiresAt)}</span>
              </div>
            </div>
            <button onClick={() => setApproveResult(null)} className="btn-primary w-full mt-5">Done</button>
          </div>
        </div>
      )}

      {/* ═══════════════ BENEFICIARY MODAL ═══════════════ */}
      {showBenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full my-8 shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl text-[#0f2b5b]">
                  {benEditing ? 'Edit Beneficiary' : 'Add External Beneficiary'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pre-verify an external account for transfers
                </p>
              </div>
              <button onClick={() => setShowBenModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {benError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {benError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Account Holder Name *
                </label>
                <input className="field" value={benForm.accountName}
                  onChange={e => setBenForm({ ...benForm, accountName: e.target.value.toUpperCase() })}
                  placeholder="e.g. JOHN SMITH" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Bank *
                </label>
                <select className="field" value={benForm.bankName}
                  onChange={e => onBankSelect(e.target.value)}>
                  <option value="">Select bank...</option>
                  {US_BANKS.map(b => (
                    <option key={b.routing} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Routing Number *
                  </label>
                  <input className="field font-mono" maxLength={9}
                    value={benForm.routingNumber}
                    onChange={e => setBenForm({ ...benForm, routingNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="9 digits" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Account Number *
                  </label>
                  <input className="field font-mono"
                    value={benForm.accountNumber}
                    onChange={e => setBenForm({ ...benForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="6-17 digits" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Account Type
                  </label>
                  <select className="field" value={benForm.accountType}
                    onChange={e => setBenForm({ ...benForm, accountType: e.target.value })}>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Customer ID (optional)
                  </label>
                  <input className="field font-mono" value={benForm.customerId}
                    onChange={e => setBenForm({ ...benForm, customerId: e.target.value })}
                    placeholder="Vendor ID, contract #, etc." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Description (optional)
                </label>
                <textarea className="field" rows="2" value={benForm.description}
                  onChange={e => setBenForm({ ...benForm, description: e.target.value })}
                  placeholder="e.g. Primary electrical contractor" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowBenModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveBen} disabled={benSaving}
                className="px-8 py-2.5 bg-[#0f2b5b] hover:bg-[#0a2148] text-white font-bold rounded-md disabled:opacity-50">
                {benSaving ? 'Saving…' : (benEditing ? 'Save Changes' : 'Add Beneficiary')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}