const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const auth    = require('../middleware/auth');
const prisma  = require('../config/db');
const { resolveBank, isOurBank } = require('../config/usBanks');
const { createNotification }    = require('../utils/notify');

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

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCK_MINUTES = 30;

/**
 * Verify the transfer PIN.
 * Supports both bcrypt-hashed (new) and plaintext (legacy) codes.
 */
async function verifyPin(account, code) {
  if (account.transferCodeHash) {
    return bcrypt.compare(code, account.transferCodeHash);
  }
  return account.transferCode === code;
}

// ============================================================
// POST /api/transfers
// Initiates a transfer.
//   • Internal (CFB → CFB): sender notified, receiver notified
//   • External (CFB → other bank): sender notified, receiver
//     "notified" via simulated inter-bank settlement
//
// Balance is NOT deducted at initiation.
//   balance       stays the same
//   pendingOut    increases
//   available = balance - pendingOut
// ============================================================
router.post('/', auth, async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountNumber,
      toRoutingNumber,
      amount,
      transferCode,
    } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!toAccountNumber) return res.status(400).json({ error: 'Recipient account required' });

    // Load sender + their user (for PIN lock)
    const sender = await prisma.account.findUnique({
      where: { id: fromAccountId },
      include: { user: true }
    });
    if (!sender) return res.status(404).json({ error: 'Sender account not found' });
    if (sender.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const senderUser = sender.user;

    // ── PIN lock check ────────────────────────────────────────
    if (senderUser.pinLockedUntil && new Date() < senderUser.pinLockedUntil) {
      const minsLeft = Math.ceil((new Date(senderUser.pinLockedUntil) - new Date()) / 60000);
      return res.status(403).json({
        error: `Account locked due to too many incorrect transfer codes. Try again in ${minsLeft} minutes.`
      });
    }

    // ── PIN verify ────────────────────────────────────────────
    const pinOk = await verifyPin(sender, transferCode);
    if (!pinOk) {
      const attempts = (senderUser.pinAttempts || 0) + 1;
      const updates = { pinAttempts: attempts };
      if (attempts >= MAX_PIN_ATTEMPTS) {
        updates.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000);
      }
      await prisma.user.update({ where: { id: senderUser.id }, data: updates });

      if (attempts >= MAX_PIN_ATTEMPTS) {
        await createNotification(senderUser.id, 'FAILED',
          'Account temporarily locked',
          `Too many incorrect transfer codes. Your account is locked for ${PIN_LOCK_MINUTES} minutes.`
        );
        return res.status(403).json({
          error: `Too many incorrect attempts. Account locked for ${PIN_LOCK_MINUTES} minutes.`
        });
      }
      const remaining = MAX_PIN_ATTEMPTS - attempts;
      return res.status(403).json({
        error: `Incorrect transfer code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // ── PIN correct — reset counter ───────────────────────────
    if ((senderUser.pinAttempts > 0) || senderUser.pinLockedUntil) {
      await prisma.user.update({
        where: { id: senderUser.id },
        data:  { pinAttempts: 0, pinLockedUntil: null }
      });
    }

    // ── Available balance check ───────────────────────────────
    const available = Number(sender.balance) - Number(sender.pendingOut || 0);
    if (available < amount) {
      return res.status(400).json({
        error: 'Insufficient available balance. Available: $' +
          available.toLocaleString('en-US', { minimumFractionDigits: 2 })
      });
    }

    // ── Resolve recipient ─────────────────────────────────────
    const recipient = await prisma.account.findUnique({
      where: { accountNumber: toAccountNumber },
      include: { user: true }
    });

    const isInternal = !!(recipient && recipient.isRegistered);
    const finalStatus = isInternal ? 'SUCCESS' : 'PENDING';

    let recipientName = recipient ? recipient.accountName : resolveExternalName(toAccountNumber);

    let recipientBank;
    if (isInternal) {
      recipientBank = 'Continental Federal Bank & Trust, New York, NY';
    } else if (toRoutingNumber) {
      recipientBank = resolveBank(toRoutingNumber);
    } else {
      recipientBank = 'Beneficiary Bank';
    }

    const reference = 'NB' + Date.now() + Math.floor(Math.random() * 90 + 10);
    const note = isInternal
      ? 'Transfer completed successfully.'
      : 'Inter-bank transfer initiated. Awaiting settlement confirmation.';

    // ── Execute in transaction ────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Sender: increase pendingOut (do NOT touch balance)
      const updatedSender = await tx.account.update({
        where: { id: sender.id },
        data:  { pendingOut: { increment: amount } }
      });

      // Internal: credit receiver right away
      if (isInternal && recipient) {
        await tx.account.update({
          where: { id: recipient.id },
          data:  { balance: { increment: amount } }
        });
      }

      return tx.transaction.create({
        data: {
          reference,
          amount,
          status: finalStatus,
          type: 'TRANSFER',
          category: isInternal ? 'INTERNAL' : 'INTERBANK',
          description: isInternal
            ? 'Transfer to ' + recipientName
            : 'Inter-bank transfer to ' + recipientName + ' at ' + recipientBank,
          balanceAfter: updatedSender.balance,
          note,
          isPending: !isInternal,
          fromAccountId: sender.id,
          toAccountId: recipient ? recipient.id : null,
          initiatedBy: req.userId,
        }
      });
    });

    // ── Notifications ─────────────────────────────────────────
    const amountStr = '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

    await createNotification(
      senderUser.id,
      'TRANSFER_OUT',
      isInternal ? 'Transfer sent' : 'Transfer initiated',
      isInternal
        ? `${amountStr} to ${recipientName} (${recipientBank}) — completed.`
        : `${amountStr} to ${recipientName} at ${recipientBank} — pending settlement.`,
      { reference, amount, status: finalStatus }
    );

    if (isInternal && recipient) {
      await createNotification(
        recipient.userId,
        'TRANSFER_IN',
        'Funds received',
        `${amountStr} from ${sender.accountName} — settled to your account.`,
        { reference, amount, status: 'SUCCESS' }
      );
    }

    res.json({
      success: true,
      receipt: {
        reference,
        date: result.createdAt,
        status: finalStatus,
        from: {
          name: sender.accountName,
          account: sender.accountNumber,
          bank: 'Continental Federal Bank & Trust, New York, NY',
          routing: '021407912',
        },
        to: {
          name: recipientName,
          account: toAccountNumber,
          bank: recipientBank,
          routing: toRoutingNumber || (isInternal ? '021407912' : ''),
        },
        amount: Number(amount),
        balanceAfter: Number(result.balanceAfter),
        note,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
});

// ============================================================
// GET /api/transfers/history
// ============================================================
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