const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const audit = require('../middleware/audit');

router.post('/login',
  body('username').isLength({ min: 4, max: 32 }).trim().escape(),
  body('password').isLength({ min: 6, max: 128 }),
  audit('LOGIN_ATTEMPT'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    const dummy = '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const valid = await bcrypt.compare(password, user?.passwordHash || dummy);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

module.exports = router;
