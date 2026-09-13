const router = require('express').Router();
const auth = require('../middleware/auth');
const prisma = require('../config/db');
const { resolveBank, isOurBank } = require('../config/usBanks');

const EXTERNAL_NAMES = [
  'JOHN SMITH', 'MARY JOHNSON', 'ROBERT WILLIAMS', 'PATRICIA BROWN',
  'DAVID MILLER', 'JENNIFER DAVIS', 'RICHARD GARCIA', 'LINDA MARTINEZ',
  'CHRISTOPHER RODRIGUEZ', 'BARBARA WILSON', 'DANIEL ANDERSON',
  'SUSAN TAYLOR', 'MATTHEW THOMAS', 'KAREN MOORE', 'ANTHONY JACKSON',
  'JOSE HERNANDEZ', 'GUADALUPE LOPEZ', 'FRANCISCO RAMIREZ', 'VERONICA FLORES',
  'ALEJANDRO GOMEZ', 'PATRICIA MORALES', 'RICARDO CASTILLO', 'MARIANA VARGAS',
  'WILLIAM MARTIN', 'ELIZABETH THOMPSON', 'PATRICK LEBLANC', 'MARGARET GAGNON',
  'THOMAS ROY', 'CATHERINE BOUCHARD', 'DANIEL GAUTHIER',
  'OLIVER BENNETT', 'CHARLOTTE HUGHES', 'HENRIK LARSEN', 'SOFIA ANDERSSON',
  'PIERRE DUBOIS', 'MARIE LAURENT', 'MATTEO ROSSI', 'GIULIA BIANCHI',
  'LUKAS MULLER', 'ANNA SCHMIDT', 'CARLOS FERNANDEZ', 'ELENA MORENO',
];

function hashNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function resolveExternalName(accountNumber) {
  return EXTERNAL_NAMES[hashNumber(accountNumber) % EXTERNAL_NAMES.length];
}

/**
 * Determine which settlement network a routing number uses.
 * Big banks (Chase, BoA, WF) are FedNow-enabled.
 * Regional banks go through RTP.
 * Smaller banks fall back to ACH.
 */
function resolveNetwork(routingNumber) {
  if (!routingNumber) {
    return {
      network: 'ACH',
      settlementTime: '1-3 business days',
      networkCode: 'ACH',
    };
  }
  const prefix = String(routingNumber).slice(0, 2);

  // Top-tier banks (FedNow-enabled since 2023)
  const fedNowRoutings = [
    '021000021', '021000089', '026009593', '121000248', '021001088',
    '031000503', '051000017', '091000019', '061000104',
  ];
  if (fedNowRoutings.includes(String(routingNumber))) {
    return {
      network: 'FedNow Service',
      settlementTime: 'Instant (seconds)',
      networkCode: 'FEDNOW',
    };
  }

  // Regional banks — RTP network
  const rtpRoutings = [
    '124003116', '121042882', '256074974', '042000013', '062000019',
  ];
  if (rtpRoutings.includes(String(routingNumber))) {
    return {
      network: 'RTP® Network',
      settlementTime: 'Instant (seconds)',
      networkCode: 'RTP',
    };
  }

  // Default: ACH (batch settlement)
  return {
    network: 'ACH',
    settlementTime: '1-3 business days',
    networkCode: 'ACH',
  };
}

/**
 * Calculate a masked account number: ****1234
 */
function maskAccount(accountNumber) {
  if (!accountNumber) return '';
  const s = String(accountNumber);
  if (s.length <= 4) return '****' + s;
  return '****' + s.slice(-4);
}

/**
 * Route: GET /api/accounts
 * Returns accounts with balance / pendingOut / available
 */
router.get('/', auth, async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId }
  });
  const enriched = accounts.map(a => ({
    id:            a.id,
    accountNumber: a.accountNumber,
    accountName:   a.accountName,
    accountType:   a.accountType,
    isBusiness:    a.isBusiness,
    balance:       Number(a.balance),
    pendingOut:    Number(a.pendingOut || 0),
    available:     Number(a.balance) - Number(a.pendingOut || 0),
    openedAt:      a.openedAt,
  }));
  res.json(enriched);
});

/**
 * Name enquiry with routing resolution.
 *   GET /api/accounts/resolve/:accountNumber?routing=021000021
 *
 * Returns a rich response that mirrors what a real bank gets from the
 * inter-bank network (name on file, network type, settlement time).
 */
router.get('/resolve/:accountNumber', auth, async (req, res) => {
  const { accountNumber } = req.params;
  const routingNumber = (req.query.routing || '').trim();

  if (!/^\d{6,17}$/.test(accountNumber)) {
    return res.status(400).json({
      resolved: false,
      error: 'Account number must be 6-17 digits',
    });
  }

  // Simulate network latency (realistic ~400-800ms)
  await new Promise(r => setTimeout(r, 200 + Math.random() * 400));

  // Check if it's one of our own accounts
  const internalAccount = await prisma.account.findUnique({
    where: { accountNumber },
    select: { accountName: true, accountNumber: true, isRegistered: true, accountType: true },
  });

  if (internalAccount) {
    return res.json({
      resolved: true,
      verified: true,
      accountName: internalAccount.accountName,
      accountNumber: internalAccount.accountNumber,
      accountNumberMasked: maskAccount(internalAccount.accountNumber),
      bankName: 'Continental Federal Bank & Trust, New York, NY',
      routingNumber: routingNumber || '021407912',
      swift: 'CBFBUS33',
      isInternal: true,
      isOurBank: true,
      accountType: internalAccount.accountType,
      network: {
        network: 'Internal Transfer',
        settlementTime: 'Instant',
        networkCode: 'CFB_INTERNAL',
      },
      nameMatchConfidence: 'EXACT',
      retrievedAt: new Date().toISOString(),
    });
  }

  // External account — resolve bank name from routing number
  const bankName = routingNumber
    ? resolveBank(routingNumber)
    : 'External Financial Institution';

  const network = resolveNetwork(routingNumber);

  return res.json({
    resolved: true,
    verified: true,
    accountName: resolveExternalName(accountNumber),
    accountNumber,
    accountNumberMasked: maskAccount(accountNumber),
    bankName,
    routingNumber: routingNumber || null,
    swift: null, // Only known for international
    isInternal: false,
    isOurBank: false,
    accountType: 'checking',
    network,
    nameMatchConfidence: 'LIKELY',
    retrievedAt: new Date().toISOString(),
  });
});

module.exports = router;