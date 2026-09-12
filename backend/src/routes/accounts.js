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

router.get('/', auth, async (req, res) => {
  const accounts = await prisma.account.findMany({ where: { userId: req.userId } });
  res.json(accounts);
});

/**
 * Name enquiry — accepts optional routing number.
 *   GET /api/accounts/resolve/:accountNumber?routing=021000021
 *
 * Response includes:
 *   accountName      — beneficiary name
 *   accountNumber    — account number
 *   bankName         — resolved bank name (from routing)
 *   routingNumber    — routing number passed in
 *   isInternal       — true if this is a CFB account
 *   isOurBank        — true if routing is CFB's own
 */
router.get('/resolve/:accountNumber', auth, async (req, res) => {
  const { accountNumber } = req.params;
  const routingNumber = (req.query.routing || '').trim();

  // Look up the account in our own bank first
  const account = await prisma.account.findUnique({
    where: { accountNumber },
    select: { accountName: true, accountNumber: true, isRegistered: true }
  });

  if (account) {
    // Our own account — bank name is always Continental Federal
    return res.json({
      resolved: true,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: 'Continental Federal Bank & Trust, New York, NY',
      routingNumber: routingNumber || '021407912',
      isInternal: account.isRegistered,
      isOurBank: true,
    });
  }

  // External account — resolve bank name from routing number
  const bankName = routingNumber
    ? resolveBank(routingNumber)
    : 'External Bank';

  return res.json({
    resolved: true,
    accountName: resolveExternalName(accountNumber),
    accountNumber,
    bankName,
    routingNumber,
    isInternal: false,
    isOurBank: routingNumber ? isOurBank(routingNumber) : false,
  });
});

module.exports = router;