const express     = require('express');
const supabase    = require('../config/supabase');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/* ── GET /api/staff ──────────────────────────────────────────
   取得所有人員名單（公開，讓登入頁驗證員編用）
   ───────────────────────────────────────────────────────── */
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('staff')
    .select('emp, name, dept')
    .order('emp', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ── GET /api/staff/:emp ─────────────────────────────────────
   查詢單一人員
   ───────────────────────────────────────────────────────── */
router.get('/:emp', async (req, res) => {
  const emp = req.params.emp.toUpperCase();

  const { data, error } = await supabase
    .from('staff')
    .select('emp, name, dept')
    .eq('emp', emp)
    .single();

  if (error || !data) return res.status(404).json({ error: '查無此員編' });
  res.json(data);
});

/* ── POST /api/staff ─────────────────────────────────────────
   新增單筆人員（需 menu 以上權限）
   Body: { emp, name, dept }
   ───────────────────────────────────────────────────────── */
router.post('/', auth, requireRole('menu'), async (req, res) => {
  const emp  = (req.body.emp  || '').trim().toUpperCase();
  const name = (req.body.name || '').trim();
  const dept = (req.body.dept || '').trim();

  if (!emp || !name || !dept) {
    return res.status(400).json({ error: '缺少必要欄位 (emp, name, dept)' });
  }

  const { data, error } = await supabase
    .from('staff')
    .upsert({ emp, name, dept }, { onConflict: 'emp' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ── DELETE /api/staff/:emp ──────────────────────────────────
   刪除單一人員（需 menu 以上權限）
   ───────────────────────────────────────────────────────── */
router.delete('/:emp', auth, requireRole('menu'), async (req, res) => {
  const emp = req.params.emp.toUpperCase();

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('emp', emp);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `已刪除人員 ${emp}` });
});

/* ── POST /api/staff/import ──────────────────────────────────
   CSV 批次匯入人員（需 menu 以上權限）
   Body: { rows: [{ emp, name, dept }] }
   ───────────────────────────────────────────────────────── */
router.post('/import', auth, requireRole('menu'), async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: '請提供 rows 陣列' });
  }

  const records = rows.map(r => ({
    emp:  (r.emp  || '').trim().toUpperCase(),
    name: (r.name || '').trim(),
    dept: (r.dept || '').trim(),
  })).filter(r => r.emp && r.name && r.dept);

  if (records.length === 0) {
    return res.status(400).json({ error: '所有資料列均缺少必要欄位' });
  }

  const { data, error } = await supabase
    .from('staff')
    .upsert(records, { onConflict: 'emp' })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ inserted: data.length, rows: data });
});

module.exports = router;
