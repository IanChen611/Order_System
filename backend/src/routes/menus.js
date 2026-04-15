const express     = require('express');
const supabase    = require('../config/supabase');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/* ── GET /api/menus ──────────────────────────────────────────
   取得所有菜單（公開，不需登入）
   ───────────────────────────────────────────────────────── */
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ── POST /api/menus ─────────────────────────────────────────
   新增單筆菜單（需 menu 以上權限）
   Body: { date, main1, main2, veg, dinner, main1Limit?, holiday? }
   ───────────────────────────────────────────────────────── */
router.post('/', auth, requireRole('menu'), async (req, res) => {
  const { date, main1, main2, veg, dinner, main1Limit, holiday } = req.body;

  if (!date || !main1 || !main2 || !veg || !dinner) {
    return res.status(400).json({ error: '缺少必要欄位 (date, main1, main2, veg, dinner)' });
  }

  const { data, error } = await supabase
    .from('menus')
    .upsert({
      date,
      main1,
      main2,
      veg,
      dinner,
      main1_limit: main1Limit ?? 80,
      holiday: holiday ?? false,
    }, { onConflict: 'date' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ── PUT /api/menus/:date ────────────────────────────────────
   更新指定日期菜單（需 menu 以上權限）
   ───────────────────────────────────────────────────────── */
router.put('/:date', auth, requireRole('menu'), async (req, res) => {
  const { date } = req.params;
  const { main1, main2, veg, dinner, main1Limit, holiday } = req.body;

  const updates = {};
  if (main1      !== undefined) updates.main1       = main1;
  if (main2      !== undefined) updates.main2       = main2;
  if (veg        !== undefined) updates.veg         = veg;
  if (dinner     !== undefined) updates.dinner      = dinner;
  if (main1Limit !== undefined) updates.main1_limit = main1Limit;
  if (holiday    !== undefined) updates.holiday     = holiday;

  const { data, error } = await supabase
    .from('menus')
    .update(updates)
    .eq('date', date)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data)  return res.status(404).json({ error: '找不到該日期菜單' });
  res.json(data);
});

/* ── DELETE /api/menus/all ───────────────────────────────────
   刪除所有菜單（需 super 權限）
   ───────────────────────────────────────────────────────── */
router.delete('/all', auth, requireRole('super'), async (_req, res) => {
  const { error } = await supabase.from('menus').delete().neq('date', '');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: '已刪除所有菜單' });
});

/* ── DELETE /api/menus/:date ─────────────────────────────────
   刪除指定日期菜單（需 menu 以上權限）
   ───────────────────────────────────────────────────────── */
router.delete('/:date', auth, requireRole('menu'), async (req, res) => {
  const { date } = req.params;

  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('date', date);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `已刪除 ${date} 的菜單` });
});

/* ── POST /api/menus/import ──────────────────────────────────
   CSV 批次匯入菜單（需 menu 以上權限）
   Body: { rows: [{ date, main1, main2, veg, dinner, main1Limit?, holiday? }] }
   ───────────────────────────────────────────────────────── */
router.post('/import', auth, requireRole('menu'), async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: '請提供 rows 陣列' });
  }

  const records = rows.map(r => ({
    date:        r.date,
    main1:       r.main1,
    main2:       r.main2,
    veg:         r.veg,
    dinner:      r.dinner,
    main1_limit: r.main1Limit ?? 80,
    holiday:     r.holiday ?? false,
  }));

  const { data, error } = await supabase
    .from('menus')
    .upsert(records, { onConflict: 'date' })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ inserted: data.length, rows: data });
});

module.exports = router;
