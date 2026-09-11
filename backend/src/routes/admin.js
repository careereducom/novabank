const router = require('express').Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const prisma = require('../config/db');
const clientCredentials = require('../config/clientCredentials');

router.get('/pending', auth, adminOnly, async (req, res) => {
  const txns = await prisma.transaction.findMany({
    where: { status: 'PENDING', type: 'TRANSFER' },
    include: { fromAccount: true, toAccount: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(txns);
});

router.get('/deposits/pending', auth, adminOnly, async (req, res) => {
  const deps = await prisma.deposit.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  });
  res.json(deps);
});

router.get('/credentials', auth, adminOnly, async (req, res) => {
  const accounts = await prisma.account.findMany({
    include: { user: { select: { username: true, fullName: true, email: true } } },
    orderBy: { accountNumber: 'asc' }
  });

  res.json(accounts.map(a => ({
    id:            a.id,
    accountNumber: a.accountNumber,
    accountName:   a.accountName,
    balance:       Number(a.balance),
    transferCode:  a.transferCode,
    username:      a.user.username,
    password:      clientCredentials[a.user.username] || '—',
    email:         a.user.email
  })));
});

router.post('/transfers/:id/approve', auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn || txn.status !== 'PENDING') {
    return res.status(400).json({ error: 'Not a pending transaction' });
  }

  await prisma.$transaction(async (tx) => {
    if (txn.toAccountId) {
      await tx.account.update({
        where: { id: txn.toAccountId },
        data: { balance: { increment: txn.amount } }
      });
    }
    await tx.transaction.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        note: 'Approved by operations',
        resolvedAt: new Date(),
        resolvedBy: req.userId
      }
    });
  });

  res.json({ success: true });
});

router.post('/transfers/:id/reject', auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn || txn.status !== 'PENDING') {
    return res.status(400).json({ error: 'Not a pending transaction' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: txn.fromAccountId },
      data: { balance: { increment: txn.amount } }
    });
    await tx.transaction.update({
      where: { id },
      data: {
        status: 'REJECTED',
        note: 'Rejected — funds returned to sender',
        resolvedAt: new Date(),
        resolvedBy: req.userId
      }
    });
  });

  res.json({ success: true });
});

router.post('/deposits/:id/approve', auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  const dep = await prisma.deposit.findUnique({ where: { id } });
  if (!dep || dep.status !== 'PENDING') {
    return res.status(400).json({ error: 'Not pending' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: dep.accountId },
      data: { balance: { increment: dep.amount } }
    });
    await tx.deposit.update({
      where: { id },
      data: { status: 'APPROVED', resolvedAt: new Date() }
    });
  });

  res.json({ success: true });
});

router.post('/deposits/:id/reject', auth, adminOnly, async (req, res) => {
  await prisma.deposit.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', resolvedAt: new Date() }
  });
  res.json({ success: true });
});

module.exports = router;