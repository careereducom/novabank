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
// ============================================================
// KYC APPLICATIONS — list, approve, reject
// ============================================================

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// List all pending applications
router.get('/applications', auth, adminOnly, async (req, res) => {
  const apps = await prisma.user.findMany({
    where: { approvalStatus: 'PENDING', isAdmin: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      dateOfBirth: true,
      ssnLast4: true,
      kycStatus: true,
      approvalStatus: true,
      signupIp: true,
      signupLocation: true,
      signupUserAgent: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(apps);
});

// List approved but not yet activated
router.get('/applications/approved', auth, adminOnly, async (req, res) => {
  const apps = await prisma.user.findMany({
    where: { approvalStatus: 'APPROVED', isAdmin: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      approvedAt: true,
      accessCodeExpiry: true,
      createdAt: true,
    },
    orderBy: { approvedAt: 'desc' },
  });
  res.json(apps);
});

// List rejected
router.get('/applications/rejected', auth, adminOnly, async (req, res) => {
  const apps = await prisma.user.findMany({
    where: { approvalStatus: 'REJECTED', isAdmin: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      rejectedReason: true,
      approvedAt: true,
      createdAt: true,
    },
    orderBy: { approvedAt: 'desc' },
    take: 100,
  });
  res.json(apps);
});

// Approve application — generate access code + email applicant
router.post('/applications/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Application not found' });
    if (user.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Application is not pending' });
    }

    // Generate 6-digit access code
    const accessCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        approvalStatus: 'APPROVED',
        accessCode,
        accessCodeExpiry: expiry,
        approvedAt: new Date(),
        approvedBy: req.userId,
      }
    });

    // Send email to applicant with access code
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f4f6fa; padding: 30px;">
        <div style="background: #0f2b5b; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px; letter-spacing: 1px;">CONTINENTAL FEDERAL</h1>
          <p style="color: #c9a227; margin: 4px 0 0; font-size: 11px; letter-spacing: 3px;">BANK &amp; TRUST</p>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0f2b5b; font-size: 18px; margin-top: 0;">Your Application is Approved</h2>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            Dear ${user.fullName},
          </p>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            Welcome to Continental Federal Bank &amp; Trust. Your application has been approved.
            To activate your account, please use the access code below.
          </p>
          <div style="background: #f4f6fa; border: 1px dashed #c9a227; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px;">
            <p style="font-size: 11px; letter-spacing: 3px; color: #666; margin: 0 0 8px;">YOUR ACCESS CODE</p>
            <p style="font-size: 36px; letter-spacing: 12px; font-family: monospace; color: #0f2b5b; margin: 0; font-weight: bold;">${accessCode}</p>
          </div>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            <strong>To activate your account:</strong><br>
            1. Go to the Continental Federal login page.<br>
            2. Click "Activate Account".<br>
            3. Enter your account number <strong>${user.username}</strong> and the access code above.<br>
            4. Once activated, you can sign in normally.
          </p>
          <p style="color: #b45309; background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 20px;">
            ⚠ <strong>Important:</strong> This access code expires in 24 hours. If it expires, contact support at 1-800-CFB-BANK.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">
            Continental Federal Bank &amp; Trust · Member FDIC · Equal Housing Lender
          </p>
        </div>
      </div>
    `;

    resend.emails.send({
      from: 'Continental Federal Bank <onboarding@resend.dev>',
      to: user.email,
      subject: 'Account Approved — Your Access Code',
      html,
    }).then(() => console.log(`[KYC] Approval email sent to ${user.email}`))
      .catch(err => console.error('[KYC] Approval email failed:', err.message));

    await prisma.auditLog.create({
      data: {
        action: 'KYC_APPROVE',
        userId: req.userId,
        path: `/api/admin/applications/${user.id}/approve`,
        success: true,
        detail: `Approved ${user.username}`,
      }
    });

    res.json({
      success: true,
      accessCode,          // shown to admin too
      email: user.email,
      expiresAt: expiry,
      message: 'Application approved. Access code emailed to applicant.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reject application — with reason + email applicant
router.post('/applications/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Application not found' });
    if (user.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Application is not pending' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        approvalStatus: 'REJECTED',
        rejectedReason: reason || 'Application did not meet our requirements.',
        approvedAt: new Date(),
        approvedBy: req.userId,
      }
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f4f6fa; padding: 30px;">
        <div style="background: #b1122b; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px; letter-spacing: 1px;">CONTINENTAL FEDERAL</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #b1122b; font-size: 18px; margin-top: 0;">Application Update</h2>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            Dear ${user.fullName},
          </p>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            Thank you for your interest in Continental Federal Bank &amp; Trust.
            After reviewing your application, we regret to inform you that we are unable to open an account at this time.
          </p>
          <div style="background: #fef2f2; border-left: 3px solid #b1122b; padding: 16px; margin: 20px 0;">
            <p style="font-size: 11px; letter-spacing: 2px; color: #666; margin: 0 0 6px;">REASON</p>
            <p style="color: #444; margin: 0; font-size: 14px;">${reason || 'Application did not meet our requirements.'}</p>
          </div>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            If you believe this decision was made in error, please contact us at 1-800-CFB-BANK.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">
            Continental Federal Bank &amp; Trust · Member FDIC · Equal Housing Lender
          </p>
        </div>
      </div>
    `;

    resend.emails.send({
      from: 'Continental Federal Bank <onboarding@resend.dev>',
      to: user.email,
      subject: 'Application Update — Continental Federal Bank',
      html,
    }).then(() => console.log(`[KYC] Rejection email sent to ${user.email}`))
      .catch(err => console.error('[KYC] Rejection email failed:', err.message));

    await prisma.auditLog.create({
      data: {
        action: 'KYC_REJECT',
        userId: req.userId,
        path: `/api/admin/applications/${user.id}/reject`,
        success: true,
        detail: `Rejected ${user.username}: ${reason || 'no reason given'}`,
      }
    });

    res.json({ success: true, message: 'Application rejected. Applicant notified by email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;