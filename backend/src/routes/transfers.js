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

router.post('/', auth, async (req, res) => {
  try {
    const { fromAccountId, toAccountNumber, amount, transferCode } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const sender = await prisma.account.findUnique({ where: { id: fromAccountId } });
    if (!sender) return res.status(404).json({ error: 'Sender account not found' });
    if (sender.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    if (sender.transferCode !== transferCode) {
      return res.status(403).json({ error: 'Incorrect transfer code' });
    }

    if (Number(sender.balance) < amount) {
      return res.status(400).json({
        error: 'Insufficient funds. Balance: $' + Number(sender.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })
      });
    }

    const recipient = await prisma.account.findUnique({
      where: { accountNumber: toAccountNumber }
    });

    const isInternal = recipient && recipient.isRegistered;
    const status = isInternal ? 'SUCCESS' : 'PENDING';

    const note = isInternal
      ? 'Transfer completed successfully.'
      : 'Inter-bank transfer initiated. Awaiting settlement confirmation.';

    let recipientName = recipient ? recipient.accountName : null;
    if (!recipientName) recipientName = resolveExternalName(toAccountNumber);

    const result = await prisma.$transaction(async (tx) => {
      const updatedSender = await tx.account.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } }
      });

      if (isInternal && recipient) {
        await tx.account.update({
          where: { id: recipient.id },
          data: { balance: { increment: amount } }
        });
      }

      return tx.transaction.create({
        data: {
          reference: 'NB' + Date.now() + Math.floor(Math.random() * 90 + 10),
          amount,
          status,
          type: 'TRANSFER',
          category: isInternal ? 'INTERNAL' : 'INTERBANK',
          description: isInternal
            ? 'Transfer to ' + recipientName
            : 'Inter-bank transfer to ' + recipientName,
          balanceAfter: updatedSender.balance,
          note,
          fromAccountId: sender.id,
          toAccountId: recipient ? recipient.id : null,
          initiatedBy: req.userId
        }
      });
    });

    res.json({
      success: true,
      receipt: {
        reference: result.reference,
        date: result.createdAt,
        status: result.status,
        from: { name: sender.accountName, account: sender.accountNumber },
        to:   { name: recipientName,       account: toAccountNumber },
        amount: Number(amount),
        balanceAfter: Number(result.balanceAfter),
        note: result.note
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const userAccounts = await prisma.account.findMany({
      where: { userId: req.userId },
      select: { id: true }
    });
    const accountIds = userAccounts.map(a => a.id);

    const txns = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    res.json(txns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;