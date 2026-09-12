import { useState, useRef, useEffect } from 'react';

const QUICK_REPLIES = {
  '1': 'How do I reset my password?',
  '2': 'What are your transfer limits?',
  '3': 'How do I report a lost card?',
  '4': 'Speak to a human agent',
};

const RESPONSES = {
  'reset':      "To reset your password: click 'Forgot password?' on the sign-in page. You'll receive a reset link within 60 seconds. For security, the link expires in 15 minutes.",
  'transfer':   'Daily transfer limits:\n• Standard accounts: $25,000/day\n• Premium accounts: $250,000/day\n• Private clients: $5,000,000/day\n\nFor higher amounts, contact your relationship manager.',
  'lost':       "If your card is lost or stolen:\n1. Open Cards → Freeze Card\n2. Report to us immediately at 1-800-CFB-BANK\n3. We'll issue a replacement within 3–5 business days (free of charge).",
  'human':      "An agent will be with you in about 2 minutes. In the meantime, you can call us directly at 1-800-CFB-BANK (24/7).",
  'hours':      'Our customer service team is available:\n• Phone: 24/7\n• Chat: 6 AM – 11 PM ET, Mon–Sun\n• Email: response within 4 hours',
  'default':    "Thanks for your message. I can help with passwords, transfers, cards, accounts, and security. Try one of the quick topics below, or type your question.",
};

function pickResponse(text) {
  const t = (text || '').toLowerCase();
  if (/password|reset|forgot/.test(t))     return RESPONSES['reset'];
  if (/transfer|limit|send|wire/.test(t))  return RESPONSES['transfer'];
  if (/lost|stolen|freeze|card/.test(t))   return RESPONSES['lost'];
  if (/human|agent|person|representative/.test(t)) return RESPONSES['human'];
  if (/hour|open|time|available/.test(t))  return RESPONSES['hours'];
  return RESPONSES['default'];
}

export default function LiveChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi there 👋 I'm Ava, your Continental Federal assistant. How can I help you today?" },
  ]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  const send = (text) => {
    const value = (text || '').trim();
    if (!value) return;

    // Append user message
    setMessages(prev => [...prev, { from: 'user', text: value }]);
    setInput('');
    setTyping(true);

    // Simulated agent delay
    setTimeout(() => {
      const reply = pickResponse(value);
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
      setTyping(false);
    }, 900 + Math.random() * 700);
  };

  const submit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#0f2b5b] hover:bg-[#0a2148] text-white shadow-2xl grid place-items-center transition"
        aria-label="Open chat">
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
             style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f2b5b] to-[#0a2148] text-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#c9a227] grid place-items-center font-bold text-[#0f2b5b]">
                A
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Ava · CFB Assistant</p>
                <p className="text-xs text-blue-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  Online · responds instantly
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                  m.from === 'user'
                    ? 'bg-[#0f2b5b] text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick topics</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(QUICK_REPLIES).map((label, i) => (
                  <button key={i}
                    onClick={() => send(label)}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:border-[#0f2b5b] hover:text-[#0f2b5b] text-xs font-medium text-gray-600 rounded-full transition">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={submit} className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-full text-sm outline-none focus:border-[#0f2b5b] focus:ring-2 focus:ring-[#0f2b5b]/10"
            />
            <button type="submit" disabled={!input.trim()}
              className="w-10 h-10 rounded-full bg-[#0f2b5b] hover:bg-[#0a2148] text-white grid place-items-center disabled:opacity-40 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}