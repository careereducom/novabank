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

function resolveExternalName(accountNumber) {
  let hash = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    hash = (hash * 31 + accountNumber.charCodeAt(i)) >>> 0;
  }
  return EXTERNAL_NAMES[hash % EXTERNAL_NAMES.length];
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
      accountNumber: account.accountNumber,
      isInternal: account.isRegistered
    });
  }

  res.json({
    resolved: true,
    accountName: resolveExternalName(accountNumber),
    accountNumber,
    isInternal: false
  });
});

module.exports = router;
