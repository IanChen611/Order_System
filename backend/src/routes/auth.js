const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

/* ── POST /api/auth/staff-login ──────────────────────────────
   訂餐頁：員編存在於 staff 資料表即可登入，無需密碼
   Body: { emp: "V08001" }
   ───────────────────────────────────────────────────────── */
router.post('/staff-login', async (req, res) => {
  const emp = (req.body.emp || '').trim().toUpperCase();
  if (!emp) return res.status(400).json({ error: '請提供員編' });

  const { data, error } = await supabase
    .from('staff')
    .select('emp, name, dept')
    .eq('emp', emp)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: '查無此員編，請確認後重試' });
  }

  const token = jwt.sign(
    { emp: data.emp, name: data.name, dept: data.dept, role: 'staff' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: data });
});

/* ── POST /api/auth/admin-login ──────────────────────────────
   後台：員編 + 密碼（預設密碼 = 000）
   Body: { emp: "Y00780", password: "000" }
   ───────────────────────────────────────────────────────── */
router.post('/admin-login', async (req, res) => {
  const emp      = (req.body.emp      || '').trim().toUpperCase();
  const password = (req.body.password || '').trim();

  if (!emp || !password) return res.status(400).json({ error: '請提供員編與密碼' });

  const { data, error } = await supabase
    .from('admins')
    .select('emp, name, dept, role, password_hash')
    .eq('emp', emp)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: '查無此員編，請確認是否在管理員名冊中' });
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '密碼錯誤（預設密碼為 000）' });
  }

  const token = jwt.sign(
    { emp: data.emp, name: data.name, dept: data.dept, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password_hash: _, ...user } = data;
  res.json({ token, user });
});

module.exports = router;
