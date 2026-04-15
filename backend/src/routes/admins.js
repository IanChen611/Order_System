const express     = require('express');
const bcrypt      = require('bcryptjs');
const supabase    = require('../config/supabase');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/* ── GET /api/admins ─────────────────────────────────────────
   取得所有管理員名冊（需 super 權限）
   ───────────────────────────────────────────────────────── */
router.get('/', auth, requireRole('super'), async (_req, res) => {
  const { data, error } = await supabase
    .from('admins')
    .select('emp, name, dept, role')
    .order('emp', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ── POST /api/admins ────────────────────────────────────────
   新增管理員（需 super 權限）
   Body: { emp, name, dept, role }
   密碼預設為 000，以 bcrypt 儲存
   ───────────────────────────────────────────────────────── */
router.post('/', auth, requireRole('super'), async (req, res) => {
  const emp  = (req.body.emp  || '').trim().toUpperCase();
  const name = (req.body.name || '').trim();
  const dept = (req.body.dept || '').trim();
  const role = req.body.role || 'menu';

  if (!emp || !name || !dept) {
    return res.status(400).json({ error: '缺少必要欄位 (emp, name, dept)' });
  }

  if (!['super', 'menu'].includes(role)) {
    return res.status(400).json({ error: 'role 必須為 super 或 menu' });
  }

  const password_hash = await bcrypt.hash(emp, 10);  // 預設密碼 = 員編

  const { data, error } = await supabase
    .from('admins')
    .upsert({ emp, name, dept, role, password_hash }, { onConflict: 'emp' })
    .select('emp, name, dept, role')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ── DELETE /api/admins/:emp ─────────────────────────────────
   刪除管理員（需 super 權限，且不能刪自己）
   ───────────────────────────────────────────────────────── */
router.delete('/:emp', auth, requireRole('super'), async (req, res) => {
  const emp = req.params.emp.toUpperCase();

  if (emp === req.user.emp) {
    return res.status(400).json({ error: '不能刪除自己的帳號' });
  }

  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('emp', emp);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `已刪除管理員 ${emp}` });
});

module.exports = router;
