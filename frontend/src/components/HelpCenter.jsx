import { useState } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Account & Access',
    icon: '🔐',
    items: [
      {
        q: 'How do I reset my password?',
        a: 'On the sign-in page, click "Forgot password?". You will receive a reset link at your registered email within 60 seconds. For security, the link expires in 15 minutes.'
      },
      {
        q: 'Why do I need a verification code (OTP)?',
        a: 'Two-factor authentication protects your account. Every sign-in requires a 6-digit code sent to your registered email. This prevents unauthorised access even if your password is compromised.'
      },
      {
        q: 'What is my transfer PIN and when do I need it?',
        a: 'Your 4-digit transfer PIN authorises every outbound payment. It is separate from your login password. You can change it any time from Settings. After 3 incorrect attempts, your account locks for 30 minutes.'
      },
      {
        q: 'Can I change my transfer PIN?',
        a: 'Yes. Go to Settings → Change Transfer PIN. You will need your current PIN to set a new one. The new PIN must be exactly 4 digits and different from the old one.'
      },
    ],
  },
  {
    title: 'Transfers & Payments',
    icon: '💸',
    items: [
      {
        q: 'How long do transfers take?',
        a: 'Transfers between Continental Federal accounts complete instantly. Inter-bank transfers (to Chase, Wells Fargo, BoA, etc.) are initiated immediately and settle within 1–3 business days.'
      },
      {
        q: 'What are my daily transfer limits?',
        a: 'Standard checking accounts: $25,000/day. Premium accounts: $250,000/day. Private client accounts: up to $5,000,000/day. Contact your relationship manager for higher limits.'
      },
      {
        q: 'Why does my balance show "Pending Outgoing"?',
        a: 'When you initiate an inter-bank transfer, the amount is held separately from your current balance until the receiving bank confirms settlement. Your Available Balance reflects what you can spend right now.'
      },
      {
        q: 'How do I send a receipt to someone?',
        a: 'After every transfer, the receipt screen offers sharing via WhatsApp, Telegram, iMessage, and email. You can also copy the receipt text to your clipboard.'
      },
    ],
  },
  {
    title: 'Cards & Security',
    icon: '💳',
    items: [
      {
        q: 'How do I order a physical card?',
        a: 'Open Cards → Order Physical Card. Cards are delivered via FedEx, UPS, or USPS within 3–5 business days. You will receive a tracking number as soon as it ships.'
      },
      {
        q: 'What if my card is lost or stolen?',
        a: 'Open Cards → Freeze Card to immediately disable it. Call us at 1-800-CFB-BANK (24/7) to report the loss. A replacement card is issued free of charge and arrives within 3–5 business days.'
      },
      {
        q: 'What does "PROCESSING" mean on a transfer?',
        a: 'PROCESSING indicates an inter-bank transfer that has been initiated but is awaiting settlement confirmation from the receiving bank. The funds are held (not deducted) until settlement completes.'
      },
      {
        q: 'How do I enable notifications?',
        a: 'Notifications are enabled by default. The bell icon in the top-right corner shows unread alerts, including transfer confirmations, incoming funds, and security events.'
      },
    ],
  },
  {
    title: 'Statements & Records',
    icon: '📄',
    items: [
      {
        q: 'How do I download a statement?',
        a: 'Go to Statements in the main navigation. Choose any date range or use a quick preset (30 days, 6 months, 1 year, 5 years, 10 years, or full history). Click "Download PDF" to receive a signed, formatted statement.'
      },
      {
        q: 'How far back do my records go?',
        a: 'Continental Federal maintains a complete transaction ledger for every account since opening — up to 15 years. Statements can be generated for any period in that range.'
      },
      {
        q: 'How do I download a direct deposit slip?',
        a: 'Go to Direct Deposit in the navigation. Your routing number, account number, and bank details are displayed. Click "Download Deposit Slip (PDF)" to give to your employer.'
      },
    ],
  },
];

export default function HelpCenter() {
  const [openItem, setOpenItem] = useState(null);
  const [search, setSearch] = useState('');

  const toggle = (key) => {
    setOpenItem(openItem === key ? null : key);
  };

  const matches = (item) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return item.q.toLowerCase().includes(s) || item.a.toLowerCase().includes(s);
  };

  const totalMatches = SECTIONS.reduce(
    (sum, sec) => sum + sec.items.filter(matches).length, 0
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[.2em] text-gray-400 uppercase">Support</p>
        <h1 className="font-serif text-3xl text-[#0f2b5b] mt-1">Help Center</h1>
        <p className="text-gray-500 text-sm mt-1">
          Answers to the questions we hear most often
        </p>
      </div>

      {/* Search */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search help topics..."
            className="flex-1 outline-none text-sm py-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-sm">
              Clear
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {totalMatches} result{totalMatches === 1 ? '' : 's'} found
          </p>
        )}
      </div>

      {/* Sections */}
      {SECTIONS.map((section, sIdx) => {
        const visibleItems = section.items.filter(matches);
        if (visibleItems.length === 0) return null;

        return (
          <div key={sIdx} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{section.icon}</span>
              <h2 className="font-serif text-lg text-[#0f2b5b] font-semibold">{section.title}</h2>
            </div>

            <div className="card divide-y divide-gray-100 overflow-hidden">
              {visibleItems.map((item, iIdx) => {
                const key = `${sIdx}-${iIdx}`;
                const isOpen = openItem === key;
                return (
                  <div key={iIdx}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition">
                      <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                      <span className={`text-gray-400 text-lg transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                        +
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed bg-gray-50 border-t border-gray-100">
                        <p className="pt-4">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {totalMatches === 0 && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">🔎</p>
          <p className="text-gray-600 mb-2">No results for "{search}"</p>
          <p className="text-sm text-gray-400">
            Try a different term or use the live chat in the bottom-right corner.
          </p>
        </div>
      )}

      {/* Contact Section */}
      <div className="card p-6 mt-8 bg-gradient-to-br from-[#0f2b5b] to-[#0a2148] text-white">
        <h3 className="font-serif text-xl mb-2">Still need help?</h3>
        <p className="text-blue-100 text-sm mb-5">
          Our team is available 24/7 by phone, and via live chat from 6 AM – 11 PM ET.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Phone</p>
            <p className="font-bold text-sm">1-800-CFB-BANK</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Email</p>
            <p className="font-bold text-sm">support@cfbank.com</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Live Chat</p>
            <p className="font-bold text-sm">Click the chat bubble →</p>
          </div>
        </div>
      </div>
    </div>
  );
}