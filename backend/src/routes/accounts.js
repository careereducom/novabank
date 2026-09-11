const router = require('express').Router();
const auth = require('../middleware/auth');
const prisma = require('../config/db');

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

const EXTERNAL_BANKS = [
  'Chase Bank, New York, NY',
  'Bank of America, Charlotte, NC',
  'Wells Fargo, San Francisco, CA',
  'Citibank, New York, NY',
  'Capital One, McLean, VA',
  'US Bank, Minneapolis, MN',
  'PNC Bank, Pittsburgh, PA',
  'TD Bank, Cherry Hill, NJ',
  'HSBC USA, New York, NY',
  'Fifth Third Bank, Cincinnati, OH',
  'Royal Bank of Canada, Toronto',
  'TD Canada Trust, Toronto',
  'Scotiabank, Toronto',
  'Bank of Montreal, Toronto',
  'CIBC, Toronto',
  'National Bank of Canada, Montreal',
  'BBVA Mexico, Mexico City',
  'Banorte, Monterrey',
  'Santander Mexico, Mexico City',
  'Citibanamex, Mexico City',
  'HSBC UK, London',
  'Barclays, London',
  'Deutsche Bank, Frankfurt',
  'BNP Paribas, Paris',
  'Banco Santander, Madrid',
  'UBS AG, Zurich',
];

function hashNumber(accountNumber) {
  let hash = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    hash = (hash * 31 + accountNumber.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function resolveExternalName(accountNumber) {
  return EXTERNAL_NAMES[hashNumber(accountNumber) % EXTERNAL_NAMES.length];
}

function resolveExternalBank(accountNumber) {
  return EXTERNAL_BANKS[hashNumber(accountNumber) % EXTERNAL_BANKS.length];
}

router.get('/', auth, async (req, res) => {
  const accounts = await prisma.account.findMany({ where: { userId: req.userId } });
  res.json(accounts);
});

router.get('/resolve/:accountNumber', auth, async (req, res) => {
  const { accountNumber } = req.params;

  const account = await prisma.account.findUnique({
    where: { accountNumber },
    select: { accountName: true, accountNumber: true, isRegistered: true }
  });

  if (account) {
    return res.json({
      resolved: true,
      accountName: account.accountName,
      bankName: 'Continental Federal Bank & Trust',
      accountNumber: account.accountNumber,
      isInternal: account.isRegistered
    });
  }

  res.json({
    resolved: true,
    accountName: resolveExternalName(accountNumber),
    bankName: resolveExternalBank(accountNumber),
    accountNumber,
    isInternal: false
  });
});

module.exports = router;