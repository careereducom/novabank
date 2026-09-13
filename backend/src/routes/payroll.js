/**
 * Payroll API — for orphanage payroll officers.
 *
 *   GET    /api/payroll/workers            — list workers
 *   POST   /api/payroll/workers            — add new worker
 *   PUT    /api/payroll/workers/:id        — edit worker
 *   DELETE /api/payroll/workers/:id        — deactivate worker
 *
 *   POST   /api/payroll/pay                — pay a single worker
 *   POST   /api/payroll/batch              — batch payment to multiple workers
 *   GET    /api/payroll/payments           — payment history
 *   GET    /api/payroll/payments/:id/payslip — PDF payslip
 *
 *   GET    /api/payroll/stats              — dashboard KPIs
 */
const router = require('express').Router();
const PDFDocument = require('pdfkit');
const auth = require('../middleware/auth');
const prisma = require('../config/db');
const bankConfig = require('../config/bank');
const { createNotification } = require('../utils/notify');

const MAX_PIN_ATTEMPTS = 3;

// ── Helpers ───────────────────────────────────────────────────────────

async function getPayrollAccount(req) {
  return await prisma.account.findFirst({
    where: { userId: req.userId, accountType: 'payroll' },
    include: { user: true },
  });
}

async function verifyPayrollPin(account, pin) {
  // Payroll accounts use plaintext PIN (same as regular transfer codes)
  return account.transferCode === pin;
}

async function checkPinWithLockout(account, pin) {
  const user = account.user;

  if (user.pinLockedUntil && new Date() < user.pinLockedUntil) {
    const mins = Math.ceil((new Date(user.pinLockedUntil) - new Date()) / 60000);
    throw { status: 403, message: `Account locked. Try again in ${mins} minutes.` };
  }

  const ok = await verifyPayrollPin(account, pin);
  if (!ok) {
    const attempts = (user.pinAttempts || 0) + 1;
    const data = { pinAttempts: attempts };
    if (attempts >= MAX_PIN_ATTEMPTS) {
      data.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.user.update({ where: { id: user.id }, data });
      await createNotification(user.id, 'FAILED',
        'Payroll account locked',
        'Too many incorrect PIN attempts. Account locked for 30 minutes.');
      throw { status: 403, message: 'Too many attempts. Account locked for 30 minutes.' };
    }
    await prisma.user.update({ where: { id: user.id }, data });
    throw { status: 403, message: `Incorrect PIN. ${MAX_PIN_ATTEMPTS - attempts} attempts remaining.` };
  }

  // Success — reset
  if ((user.pinAttempts || 0) > 0 || user.pinLockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0, pinLockedUntil: null },
    });
  }
  return true;
}

function makeRef(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() +
         Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ── WORKERS CRUD ──────────────────────────────────────────────────────

// List workers
router.get('/workers', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const workers = await prisma.worker.findMany({
      where: { payrollUserId: req.userId, isActive: true },
      orderBy: [{ department: 'asc' }, { fullName: 'asc' }],
    });

    res.json(workers.map(w => ({
      id: w.id,
      fullName: w.fullName,
      role: w.role,
      category: w.category,
      department: w.department,
      email: w.email,
      phone: w.phone,
      photoUrl: w.photoUrl,
      monthlySalary: Number(w.monthlySalary || 0),
      bankName: w.bankName,
      bankRoutingNumber: w.bankRoutingNumber,
      bankAccountNumber: w.bankAccountNumber,
      notes: w.notes,
      hireDate: w.hireDate,
      isActive: w.isActive,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add worker
router.post('/workers', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const {
      fullName, role, category, department, email, phone,
      monthlySalary, bankName, bankRoutingNumber, bankAccountNumber,
      photoUrl, notes,
    } = req.body;

    if (!fullName || !role) {
      return res.status(400).json({ error: 'Full name and role are required' });
    }

    const worker = await prisma.worker.create({
      data: {
        payrollUserId: req.userId,
        fullName,
        role,
        category: category || 'STAFF',
        department: department || 'General',
        email: email || null,
        phone: phone || null,
        monthlySalary: monthlySalary ? Number(monthlySalary) : null,
        bankName: bankName || null,
        bankRoutingNumber: bankRoutingNumber || null,
        bankAccountNumber: bankAccountNumber || null,
        photoUrl: photoUrl || null,
        notes: notes || null,
        isActive: true,
      },
    });

    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edit worker
router.put('/workers/:id', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const existing = await prisma.worker.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.payrollUserId !== req.userId) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const data = {};
    ['fullName','role','category','department','email','phone',
     'bankName','bankRoutingNumber','bankAccountNumber','photoUrl','notes'].forEach(k => {
      if (req.body[k] !== undefined) data[k] = req.body[k] || null;
    });
    if (req.body.monthlySalary !== undefined) {
      data.monthlySalary = Number(req.body.monthlySalary) || 0;
    }
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive;

    const updated = await prisma.worker.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, worker: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Soft delete worker
router.delete('/workers/:id', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const existing = await prisma.worker.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.payrollUserId !== req.userId) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    await prisma.worker.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── SINGLE PAYMENT ────────────────────────────────────────────────────

router.post('/pay', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const { workerId, amount, category, description, pin } = req.body;

    if (!workerId) return res.status(400).json({ error: 'Worker required' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!pin) return res.status(400).json({ error: 'PIN required' });

    await checkPinWithLockout(payroll, pin);

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || worker.payrollUserId !== req.userId) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const available = Number(payroll.balance) - Number(payroll.pendingOut || 0);
    if (available < amount) {
      return res.status(400).json({
        error: `Insufficient payroll funds. Available: $${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      });
    }

    const reference = makeRef('PR');
    const payCategory = category || 'SALARY';
    const desc = description || `${payCategory.toLowerCase()} payment`;

    // Create the transaction + payroll record in one atomic operation
    const result = await prisma.$transaction(async (tx) => {
      // Debit payroll via pendingOut
      const updatedPayroll = await tx.account.update({
        where: { id: payroll.id },
        data: { pendingOut: { increment: amount } },
      });

      // Create bank transaction record
      const txn = await tx.transaction.create({
        data: {
          reference,
          amount,
          status: 'PENDING',
          type: 'PAYROLL',
          category: payCategory,
          description: `${desc} — to ${worker.fullName} at ${worker.bankName || 'External Bank'}`,
          balanceAfter: updatedPayroll.balance,
          note: 'Payroll inter-bank transfer initiated. Awaiting settlement.',
          isPending: true,
          fromAccountId: payroll.id,
          initiatedBy: req.userId,
        }
      });

      // Create payroll payment record (shows SUCCESS immediately on payroll board)
      const payment = await tx.payrollPayment.create({
        data: {
          reference,
          workerId: worker.id,
          payrollUserId: req.userId,
          amount: Number(amount),
          category: payCategory,
          description: desc,
          status: 'SUCCESS',
          fromAccountId: payroll.id,
          transactionId: txn.id,
          paidBy: payroll.user.username,
        }
      });

      return { txn, payment };
    });

    const amountStr = '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

    await createNotification(
      payroll.userId,
      'TRANSFER_OUT',
      'Payroll payment sent',
      `${amountStr} to ${worker.fullName} (${worker.role}) — ${worker.bankName || 'External Bank'}`,
      { reference, amount, status: 'SUCCESS' }
    );

    res.json({
      success: true,
      payment: {
        id: result.payment.id,
        reference,
        worker: {
          name: worker.fullName,
          role: worker.role,
          bankName: worker.bankName,
        },
        amount: Number(amount),
        category: payCategory,
        status: 'SUCCESS',
        paidAt: result.payment.paidAt,
      }
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// ── BATCH PAYMENT ─────────────────────────────────────────────────────

router.post('/batch', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const { payments, pin } = req.body;

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'No payments provided' });
    }
    if (!pin) return res.status(400).json({ error: 'PIN required' });

    await checkPinWithLockout(payroll, pin);

    // Load workers
    const workerIds = payments.map(p => p.workerId);
    const workers = await prisma.worker.findMany({
      where: { id: { in: workerIds }, payrollUserId: req.userId, isActive: true },
    });
    const workerMap = new Map(workers.map(w => [w.id, w]));

    const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const available = Number(payroll.balance) - Number(payroll.pendingOut || 0);
    if (available < total) {
      return res.status(400).json({
        error: `Insufficient funds. Need $${total.toFixed(2)}, available $${available.toFixed(2)}`
      });
    }

    const batchRef = makeRef('BT');
    const results = [];

    for (const p of payments) {
      const worker = workerMap.get(p.workerId);
      if (!worker) continue;

      const amount = Number(p.amount);
      if (!amount || amount <= 0) continue;

      const reference = makeRef('PR');
      const category = p.category || 'SALARY';
      const desc = p.description || `${category.toLowerCase()} payment`;

      await prisma.$transaction(async (tx) => {
        const updatedPayroll = await tx.account.update({
          where: { id: payroll.id },
          data: { pendingOut: { increment: amount } },
        });

        const txn = await tx.transaction.create({
          data: {
            reference,
            amount,
            status: 'PENDING',
            type: 'PAYROLL',
            category,
            description: `${desc} — to ${worker.fullName} at ${worker.bankName || 'External Bank'} [BATCH ${batchRef}]`,
            balanceAfter: updatedPayroll.balance,
            note: 'Batch payroll transfer — awaiting settlement.',
            isPending: true,
            fromAccountId: payroll.id,
            initiatedBy: req.userId,
          }
        });

        const payment = await tx.payrollPayment.create({
          data: {
            reference,
            workerId: worker.id,
            payrollUserId: req.userId,
            amount,
            category,
            description: `${desc} [Batch ${batchRef}]`,
            status: 'SUCCESS',
            fromAccountId: payroll.id,
            transactionId: txn.id,
            paidBy: payroll.user.username,
          }
        });

        results.push({
          worker: worker.fullName,
          amount,
          reference: payment.reference,
        });
      });
    }

    await createNotification(
      payroll.userId,
      'TRANSFER_OUT',
      `Batch payroll sent (${results.length} workers)`,
      `Total $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} — Batch ${batchRef}`,
      { reference: batchRef, amount: total, status: 'SUCCESS' }
    );

    res.json({
      success: true,
      batchRef,
      count: results.length,
      total,
      payments: results,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Batch payment failed' });
  }
});

// ── HISTORY ───────────────────────────────────────────────────────────

router.get('/payments', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const { category, workerId, limit = 200 } = req.query;

    const where = { payrollUserId: req.userId };
    if (category && category !== 'ALL') where.category = category;
    if (workerId) where.workerId = workerId;

    const payments = await prisma.payrollPayment.findMany({
      where,
      include: { worker: true },
      orderBy: { paidAt: 'desc' },
      take: Math.min(Number(limit), 1000),
    });

    res.json(payments.map(p => ({
      id: p.id,
      reference: p.reference,
      worker: {
        id: p.worker.id,
        name: p.worker.fullName,
        role: p.worker.role,
        department: p.worker.department,
        photoUrl: p.worker.photoUrl,
        bankName: p.worker.bankName,
        bankAccountNumber: p.worker.bankAccountNumber,
      },
      amount: Number(p.amount),
      category: p.category,
      description: p.description,
      status: p.status,
      paidAt: p.paidAt,
      paidBy: p.paidBy,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── STATS ─────────────────────────────────────────────────────────────

router.get('/stats', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const workers = await prisma.worker.findMany({
      where: { payrollUserId: req.userId, isActive: true },
    });

    const payments = await prisma.payrollPayment.findMany({
      where: { payrollUserId: req.userId },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = payments.filter(p => new Date(p.paidAt) >= monthStart);

    const byCategory = {};
    payments.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + Number(p.amount);
    });

    const byDepartment = {};
    workers.forEach(w => {
      byDepartment[w.department] = (byDepartment[w.department] || 0) + Number(w.monthlySalary || 0);
    });

    res.json({
      workerCount: workers.length,
      monthlyPayrollCost: workers.reduce((s, w) => s + Number(w.monthlySalary || 0), 0),
      thisMonth: {
        count: thisMonth.length,
        total: thisMonth.reduce((s, p) => s + Number(p.amount), 0),
      },
      allTime: {
        count: payments.length,
        total: payments.reduce((s, p) => s + Number(p.amount), 0),
      },
      byCategory,
      byDepartment,
      account: {
        balance: Number(payroll.balance),
        pendingOut: Number(payroll.pendingOut || 0),
        available: Number(payroll.balance) - Number(payroll.pendingOut || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PAYSLIP PDF ───────────────────────────────────────────────────────

router.get('/payments/:id/payslip', auth, async (req, res) => {
  try {
    const payroll = await getPayrollAccount(req);
    if (!payroll) return res.status(403).json({ error: 'Payroll access only' });

    const payment = await prisma.payrollPayment.findUnique({
      where: { id: req.params.id },
      include: { worker: true },
    });

    if (!payment || payment.payrollUserId !== req.userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const w = payment.worker;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="payslip-${payment.reference}.pdf"`);
    doc.pipe(res);

    const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const stamp = d => new Date(d).toLocaleDateString('en-US',
      { year:'numeric', month:'long', day:'2-digit' });

    // Header
    doc.rect(0, 0, 595, 100).fill('#0f2b5b');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text("ST. MARY'S ORPHANAGE", 50, 30);
    doc.fontSize(10).font('Helvetica')
       .text('PAYROLL PAYSLIP', 50, 60);
    doc.fontSize(8).text(`Reference: ${payment.reference}`, 50, 78);
    doc.text(`Issued: ${stamp(payment.paidAt)}`, 400, 78, { width: 150, align: 'right' });

    // Employee info box
    doc.rect(50, 130, 495, 100).strokeColor('#d0d5dd').lineWidth(1).stroke();
    doc.fillColor('#0f2b5b').fontSize(9).font('Helvetica-Bold')
       .text('EMPLOYEE', 65, 145);
    doc.fillColor('#111').fontSize(13).font('Helvetica-Bold')
       .text(w.fullName, 65, 162);
    doc.fillColor('#555').fontSize(9).font('Helvetica')
       .text(w.role, 65, 182)
       .text(w.department, 65, 196)
       .text(w.email || '', 65, 210);

    // Payment details
    doc.fillColor('#0f2b5b').fontSize(9).font('Helvetica-Bold')
       .text('PAYMENT', 330, 145);
    doc.fillColor('#111').fontSize(22).font('Helvetica-Bold')
       .text(money(payment.amount), 330, 160);
    doc.fillColor('#555').fontSize(9).font('Helvetica')
       .text(`Category: ${payment.category}`, 330, 195)
       .text(`Paid: ${stamp(payment.paidAt)}`, 330, 210);

    // Bank details
    doc.rect(50, 250, 495, 90).strokeColor('#d0d5dd').stroke();
    doc.fillColor('#0f2b5b').fontSize(9).font('Helvetica-Bold')
       .text('PAID TO BANK ACCOUNT', 65, 265);
    doc.fillColor('#111').fontSize(10).font('Helvetica')
       .text(w.bankName || 'External Bank', 65, 285)
       .text(`Account: ****${String(w.bankAccountNumber || '').slice(-4)}`, 65, 305)
       .text(`Routing: ${w.bankRoutingNumber || '—'}`, 330, 285)
       .text(`Account holder: ${w.fullName}`, 330, 305);

    // Description
    doc.rect(50, 360, 495, 60).fill('#f4f6fa');
    doc.fillColor('#0f2b5b').fontSize(9).font('Helvetica-Bold')
       .text('DESCRIPTION', 65, 375);
    doc.fillColor('#333').fontSize(10).font('Helvetica')
       .text(payment.description || '—', 65, 395, { width: 460 });

    // Signature block
    doc.fillColor('#555').fontSize(9).font('Helvetica')
       .text('Approved by:', 50, 460)
       .text('____________________________', 50, 485)
       .text('Payroll Officer', 50, 500)
       .text('St. Mary\'s Orphanage — Payroll Department', 50, 515);

    // Footer
    doc.fillColor('#777').fontSize(8).font('Helvetica')
       .text(
         `Continental Federal Bank & Trust · ${bankConfig.routingNumber} · This payslip is computer-generated.`,
         50, 760, { width: 495, align: 'center' }
       );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;