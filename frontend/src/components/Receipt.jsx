export default function Receipt({ receipt, onClose }) {
  const money = n => '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  const displayStatus = receipt.status === 'PENDING' ? 'PROCESSING' : receipt.status;

  const buildText = () => {
    const fromRouting = receipt.from.routing ? `\nRouting   : ${receipt.from.routing}` : '';
    const toRouting   = receipt.to.routing   ? `\nRouting   : ${receipt.to.routing}`   : '';
    return `════════════════════════════
   CONTINENTAL FEDERAL BANK & TRUST
        TRANSFER RECEIPT
════════════════════════════
Reference : ${receipt.reference}
Date      : ${new Date(receipt.date).toLocaleString('en-US')}
Status    : ${displayStatus}

FROM
Name      : ${receipt.from.name}
Account   : ${receipt.from.account}${fromRouting}
Bank      : ${receipt.from.bank}

TO
Name      : ${receipt.to.name}
Account   : ${receipt.to.account}${toRouting}
Bank      : ${receipt.to.bank}

────────────────────────────
AMOUNT    : ${money(receipt.amount)}
BALANCE   : ${money(receipt.balanceAfter)}
────────────────────────────

${receipt.note}

Thank you for banking with
Continental Federal Bank & Trust.
Member FDIC · Est. 1989
════════════════════════════`;
  };

  const shareWhatsApp = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(buildText()), '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(buildText());
    const url  = encodeURIComponent('https://cfbank.com');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareIMessage = () => {
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const body = encodeURIComponent(buildText());
    window.location.href = isApple ? `sms:&body=${body}` : `sms:?body=${body}`;
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Transfer Receipt — ${receipt.reference}`);
    const body    = encodeURIComponent(buildText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyReceipt = () => {
    navigator.clipboard.writeText(buildText());
    alert('Receipt copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-5">
          <div className={`w-14 h-14 rounded-full mx-auto grid place-items-center mb-3 ${
            receipt.status === 'SUCCESS' ? 'bg-green-50' : 'bg-amber-50'
          }`}>
            <span className={`text-3xl ${receipt.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>
              {receipt.status === 'SUCCESS' ? '✓' : '⏳'}
            </span>
          </div>
          <h3 className="font-serif text-xl text-[#0f2b5b]">
            {receipt.status === 'SUCCESS' ? 'Transfer Successful' : 'Transfer Processing'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Share this receipt</p>
        </div>

        <pre className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {buildText()}
        </pre>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={shareWhatsApp}
            className="bg-[#25D366] hover:brightness-110 text-[#062e13] font-bold py-3 rounded-md transition text-sm">
            💬 WhatsApp
          </button>
          <button onClick={shareTelegram}
            className="bg-[#229ED9] hover:brightness-110 text-white font-bold py-3 rounded-md transition text-sm">
            ✈️ Telegram
          </button>
          <button onClick={shareIMessage}
            className="bg-[#0a84ff] hover:brightness-110 text-white font-bold rounded-md transition text-sm py-3">
            ✉️ iMessage
          </button>
          <button onClick={shareEmail}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-md transition text-sm">
            📧 Email
          </button>
          <button onClick={copyReceipt}
            className="col-span-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-md transition text-sm">
            📋 Copy Receipt
          </button>
        </div>

        <button onClick={onClose}
          className="w-full mt-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-md transition">
          Close
        </button>
      </div>
    </div>
  );
}