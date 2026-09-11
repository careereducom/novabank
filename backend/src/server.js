require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const logger    = require('./config/logger');
const bank      = require('./config/bank');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
});

const transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.ip,
      ms: Date.now() - start,
    });
  });
  next();
});

app.get('/', (_, res) => res.json({
  bank: bank.legalName,
  founded: bank.founded,
  yearsOfService: new Date().getFullYear() - bank.founded,
  status: 'operational',
  time: new Date().toISOString(),
}));

app.use('/api/auth',           authLimiter,     require('./routes/auth'));
app.use('/api/accounts',                        require('./routes/accounts'));
app.use('/api/transfers',      transferLimiter, require('./routes/transfers'));
app.use('/api/admin',                           require('./routes/admin'));
app.use('/api/bills',                           require('./routes/bills'));
app.use('/api/deposits',                        require('./routes/deposits'));
app.use('/api/statements',                      require('./routes/statements'));
app.use('/api/audit',                           require('./routes/audit'));
app.use('/api/signup',                          require('./routes/signup'));
app.use('/api/cards',                           require('./routes/cards'));
app.use('/api/direct-deposit',                  require('./routes/directDeposit'));

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Request could not be processed.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Continental Federal Bank API running on port ${PORT}`));