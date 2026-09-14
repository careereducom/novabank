import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState('applications');
  const [apps, setApps] = useState([]);
  const [approvedApps, setApprovedApps] = useState([]);
  const [rejectedApps, setRejectedApps] = useState([]);
  const [txns, setTxns] = useState([]);
  const [deps, setDeps] = useState([]);
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [toast, setToast] = useState('');

  // Reject modal state
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Approve result modal — show access code to admin
  const [approveResult, setApproveResult] = useState(null);

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
      const [a, ap, rj, t, d, c] = await Promise.all([
        apiFetch('/admin/applications', {}, token),
        apiFetch('/admin/applications/approved', {}, token),
        apiFetch('/admin/applications/rejected', {}, token),
        apiFetch('/admin/pending', {}, token),
        apiFetch('/admin/deposits/pending', {}, token),
        apiFetch('/admin/credentials', {}, token),
      ]);
      setApps(a); setApprovedApps(ap); setRejectedApps(rj);
      setTxns(t); setDeps(d); setCreds(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const approve = async (id, name) => {
    if (!confirm(`Approve application from ${name}? An access code will be emailed to them.`)) return;
    try {
      const res = await apiFetch(`/admin/applications/${id}/approve`, { method: 'POST' }, token);
      setApproveResult({ ...res, applicantName: name });
      load();
      flash('✓ Application approved');
    } catch (e) { flash('✗ ' + e.message); }
  };

  const openReject = (id) => {
    setRejectId(id);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return flash('Enter a reason');
    setRejecting(true);
    try {
      await apiFetch(`/admin/applications/${rejectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      }, token);
      setRejectId(null);
      setRejectReason('');
      load();
      flash('✓ Application rejected. Applicant notified.');
    } catch (e) { flash('✗ ' + e.message); }
    finally { setRejecting(false); }
  };

  const act = async (path) => {
    try {
      await apiFetch(path, { method: 'POST' }, token);
      load();
      flash('✓ Done');
    } catch (e) { flash('✗ ' + e.message); }
  };

  const copyAll = () => {
    const text = creds.map(c =>
      `${c.accountName}\n  Username : ${c.username}\n  Password : ${c.password}\n  Code     : ${c.transferCode}\n  Balance  : ${money(c.balance)}\n`
    ).join('\n');
    navigator.clipboard.writeText(text);
    flash('✓ Credentials copied');
  };

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

      {/* ═══════════════════ APPLICATIONS TAB ═══════════════════ */}
      {!loading && tab === 'applications' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-blue-900 mb-1">📋 New Account Applications</p>
            <p className="text-sm text-blue-800">
              Review applications and approve or reject. Approved applicants receive a
              6-digit access code by email and can then activate their account.
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
                      Application #{app.username} · Submitted {stamp(app.createdAt)}
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
                    <p><span className="text-gray-500">Date of Birth:</span> {app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString() : '—'}</p>
                    <p><span className="text-gray-500">SSN Last 4:</span> <span className="font-mono">•••• {app.ssnLast4 || '—'}</span></p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Address:</span> {app.addressLine1}{app.addressLine2 ? ', ' + app.addressLine2 : ''}</p>
                    <p className="text-xs text-gray-500 pl-0">
                      {app.city}, {app.state} {app.postalCode}, {app.country}
                    </p>
                  </div>
                </div>

                {/* Location / IP intelligence */}
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

      {/* ═══════════════════ APPROVED TAB ═══════════════════ */}
      {!loading && tab === 'approved' && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-green-900 mb-1">✓ Approved — Awaiting Activation</p>
            <p className="text-sm text-green-800">
              These applicants have received their access codes but haven't activated yet.
            </p>
          </div>

          {approvedApps.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No approved-but-inactive applications.</p>
            </div>
          )}

          <div className="space-y-3">
            {approvedApps.map(app => (
              <div key={app.id} className="card p-5 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-gray-800">{app.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    #{app.username} · {app.email}
                  </p>
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

      {/* ═══════════════════ REJECTED TAB ═══════════════════ */}
      {!loading && tab === 'rejected' && (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <p className="font-bold text-red-900 mb-1">✕ Rejected Applications</p>
            <p className="text-sm text-red-800">
              Applicants who were declined and notified by email.
            </p>
          </div>

          {rejectedApps.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-500">No rejected applications.</p>
            </div>
          )}

          <div className="space-y-3">
            {rejectedApps.map(app => (
              <div key={app.id} className="card p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-gray-800">{app.fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      #{app.username} · {app.email}
                    </p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                    REJECTED
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Reason:</strong> {app.rejectedReason || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {stamp(app.approvedAt || app.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ CREDENTIALS TAB ═══════════════════ */}
      {!loading && tab === 'credentials' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="max-w-2xl">
                <p className="font-bold text-blue-900 mb-1">🔐 Client Registry — Internal</p>
                <p className="text-sm text-blue-800">
                  Credentials for all registered account holders. Access restricted to
                  authorized operations staff.
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

      {/* ═══════════════════ TRANSFERS TAB ═══════════════════ */}
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

      {/* ═══════════════════ DEPOSITS TAB ═══════════════════ */}
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

      {/* ═══════════════════ REJECT MODAL ═══════════════════ */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-serif text-xl text-[#0f2b5b] mb-2">Reject Application</h3>
            <p className="text-sm text-gray-500 mb-5">
              Provide a reason. The applicant will receive this in their rejection email.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="field"
              rows="4"
              placeholder="e.g. Unable to verify identity documents"
              autoFocus
            />

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

      {/* ═══════════════════ APPROVE RESULT MODAL ═══════════════════ */}
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
                <span className="font-mono text-gray-800">{approveResult.email}</span>
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

            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              💡 Save this code — you can also see it in the <strong>Approved</strong> tab.
              The applicant uses it at the Activate page.
            </p>

            <button onClick={() => setApproveResult(null)}
              className="btn-primary w-full mt-5">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}