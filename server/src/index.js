const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const cashRoutes = require('./routes/cashRoutes');
const authMiddleware = require('./middleware/auth');
const seedAdminUser = require('./utils/seedAdminUser');
const ensureAuthUserIndexes = require('./utils/ensureAuthUserIndexes');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment variables.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment variables.');
  process.exit(1);
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
];

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function isRenderOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith('.onrender.com');
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isRenderOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cash management API is running.' });
});

app.use('/api', authRoutes);
app.use('/api', authMiddleware, cashRoutes);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    await ensureAuthUserIndexes();
    await seedAdminUser();
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
