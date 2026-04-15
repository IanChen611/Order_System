require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes   = require('./routes/auth');
const menuRoutes   = require('./routes/menus');
const staffRoutes  = require('./routes/staff');
const adminRoutes  = require('./routes/admins');
const orderRoutes  = require('./routes/orders');

const app = express();

/* ── Middleware ── */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

/* ── 靜態前端（public/ 資料夾）── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ── Routes ── */
app.use('/api/auth',   authRoutes);
app.use('/api/menus',  menuRoutes);
app.use('/api/staff',  staffRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/orders', orderRoutes);

/* ── Health check ── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

/* ── SPA fallback：非 /api 路徑一律回前端 index.html ── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
