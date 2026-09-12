const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const bank = require('../config/bank');
const audit = require('../middleware/audit');

function generateCardNumber() {
  let num = '4';
  while (num.length < 16) num += Math.floor(Math.random() * 10);
  return num;
}

function generateAccountNumber() {
  let n = '3';
  while (n.length < 10) n += Math.floor(Math.random() * 10);
  return n;
}

router.post('/start',
  body('fullName').isLength({ min: 2, max: 80 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^[0-9+\-\s()]{7,20}$/),
  body('password').isLength({ min: 8, max: 128 }),
  body('dateOfBirth').isISO8601(),
  body('addressLine1').isLength({ min: 4, max: 120 }).trim().escape(),
  body('city').isLength({ min: 2, max: 60 }).trim().escape(),
  body('state').isLength({ min: 2, max: 60 }).trim().escape(),
  body('postalCode').isLength({ min: 3, max: 12 }).trim().escape(),
  body('country').isIn(['United States', 'Canada', 'Mexico']),
  body('ssnLast4').matches(/^[0-9]{4}$/),
  audit('SIGNUP_ATTEMPT'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Please review the information provided.' });
    }

    const {
      fullName, email, phone, password, dateOfBirth,
      addressLine1, addressLine2, city, state, postalCode, country, ssnLast4,
    } = req.body;

    const dob = new Date(dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) return res.status(400).json({ error: 'Applicants must be at least 18 years of age.' });
    if (age > 120) return res.status(400).json({ error: 'Invalid date of birth.' });

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return res.status(400).json({ error: 'An account already exists with this email.' });

    const passwordHash = await bcrypt.hash(password, 12);

    let accountNumber;
    let attempts = 0;
    do {
      accountNumber = generateAccountNumber();
      attempts++;
    } while (await prisma.account.findUnique({ where: { accountNumber } }) && attempts < 10);

    const transferCode = Math.floor(1000 + Math.random() * 9000).toString();
    const transferCodeHash = await bcrypt.hash(transferCode, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          accountNumber,
          accountName: fullName.toUpperCase(),
          balance: 0,
          accountType: 'checking',
          isBusiness: false,
          transferCode,
          transferCodeHash,
          isRegistered: true,
          openedAt: new Date(),
          userId: user.id,
        }
      });

      const account = await tx.account.create({
        data: {
          accountNumber,
          accountName: fullName.toUpperCase(),
          balance: 0,
          accountType: 'checking',
          isBusiness: false,
          transferCode,
          isRegistered: true,
          openedAt: new Date(),
          userId: user.id,
        }
      });

      const now = new Date();
      const cardNumber = generateCardNumber();
      const card = await tx.card.create({
        data: {
          cardNumber,
          last4: cardNumber.slice(-4),
          brand: 'VISA',
          type: 'VIRTUAL',
          status: 'ACTIVE',
          expiryMonth: now.getMonth() + 1,
          expiryYear: now.getFullYear() + 4,
          cvv: String(Math.floor(100 + Math.random() * 900)),
          holderName: fullName.toUpperCase(),
          accountId: account.id,
          userId: user.id,
        }
      });

      return { user, account, card };
    });

    res.json({
      success: true,
      message: 'Welcome to Continental Federal Bank & Trust.',
      accountNumber,
      routingNumber: bank.routingNumber,
      transferCode,
      cardLast4: result.card.last4,
    });
  }
);

module.exports = router;
