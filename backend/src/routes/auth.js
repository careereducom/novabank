const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const audit = require('../middleware/audit');
const { sendOtpEmail } = require('../config/mailer');

// ============================================================
// STAGE 1 — Verify password, send OTP to email
// ============================================================
router.post('/login',
  body('username').isLength({ min: 4, max: 32 }).trim().escape(),
  body('password').isLength({ min: 6, max: 128 }),
  audit('LOGIN_ATTEMPT'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid credentials' });

    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    const dummy = '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const valid = await bcrypt.compare(password, user?.passwordHash || dummy);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { loginOtp: otp, loginOtpExpiry: expiry }
    });

    const stageToken = jwt.sign(
      { userId: user.id, stage: 'otp' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const recipient = process.env.DEMO_EMAIL || user.email;
    const email = recipient;
    const maskedEmail = recipient.replace(/^(.{2}).*@/, '$1***@');

    sendOtpEmail(email, otp, user.fullName)
      .then(() => console.log('[OTP] Sent to ' + email))
      .catch(err => console.error('[OTP] Email failed:', err.message));

    res.json({
      success: true,
      otpRequired: true,
      stageToken,
      destination: maskedEmail,
      message: 'A 6-digit code has been sent to ' + maskedEmail + '.',
    });
  }
);

// ============================================================
// STAGE 2 — Verify OTP
// ============================================================
router.post('/verify-otp',
  body('code').isLength({ min: 6, max: 6 }),
  audit('OTP_VERIFY'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Enter the 6-digit code' });

    const { stageToken, code } = req.body;
    if (!stageToken) return res.status(400).json({ error: 'Session expired. Please sign in again.' });

    let decoded;
    try {
      decoded = jwt.verify(stageToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    if (decoded.stage !== 'otp') return res.status(401).json({ error: 'Invalid session' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'Session invalid' });

    if (!user.loginOtp || !user.loginOtpExpiry) {
      return res.status(400).json({ error: 'No active code. Please sign in again.' });
    }

    if (new Date() > user.loginOtpExpiry) {
      return res.status(400).json({ error: 'Code expired. Please sign in again.' });
    }

    if (user.loginOtp !== code) {
      return res.status(401).json({ error: 'Incorrect code. Please try again.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginOtp: null, loginOtpExpiry: null }
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { id:true, accountNumber:true, accountName:true, balance:true, accountType:true },
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, isAdmin: user.isAdmin },
      accounts,
    });
  }
);

// ============================================================
// RESEND OTP
// ============================================================
router.post('/resend-otp', async (req, res) => {
  const { stageToken } = req.body;
  if (!stageToken) return res.status(400).json({ error: 'Session expired' });

  let decoded;
  try {
    decoded = jwt.verify(stageToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) return res.status(401).json({ error: 'Session invalid' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { loginOtp: otp, loginOtpExpiry: expiry }
  });

    sendOtpEmail(process.env.DEMO_EMAIL || user.email, otp, user.fullName)
    .then(() => console.log('[OTP-RESEND] Sent to ' + user.email))
    .catch(err => console.error('[OTP-RESEND] Failed:', err.message));

  res.json({ success: true, message: 'A new code has been sent.' });
});

module.exports = router;