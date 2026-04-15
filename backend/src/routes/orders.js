const express     = require('express');
const supabase    = require('../config/supabase');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

const VALID_DISH   = ['main1', 'main2', 'veg', 'dinner'];
const VALID_RICE   = ['white', 'health'];
const VALID_LOC    = ['douliou', 'huwei'];
const VALID_TYPE   = ['lunch', 'dinner'];
const VALID_STATUS = ['pending', 'done'];

/* ── GET /api/orders/dish-count ──────────────────────────────
   公開端點：回傳指定日期各菜色的訂購數量（前端顯示主菜一剩餘用）
   Query: ?date=2026-04-07
   ───────────────────────────────────────────────────────── */
router.get('/dish-count', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: '請提供 date' });

  const { data, error } = await supabase
    .from('orders')
    .select('dish, qty')
    .eq('date', date);

  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  (data || []).forEach(o => {
    counts[o.dish] = (counts[o.dish] || 0) + o.qty;
  });
  res.json(counts);
});

/* ── GET /api/orders ─────────────────────────────────────────
   查詢訂單（需登入）
   Query: ?date=2026-04-07 &emp=V08001 &status=pending
   ───────────────────────────────────────────────────────── */
router.get('/', auth, async (req, res) => {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: true });

  if (req.query.date)   query = query.eq('date',   req.query.date);
  if (req.query.emp)    query = query.eq('emp',     req.query.emp.toUpperCase());
  if (req.query.status) query = query.eq('status',  req.query.status);

  // 一般 staff 只能查自己的訂單
  if (req.user.role === 'staff') {
    query = query.eq('emp', req.user.emp);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ── POST /api/orders ────────────────────────────────────────
   建立訂單（需登入，staff 只能建自己的）
   Body: { date, mealType, loc, dish, rice, qty }
   ───────────────────────────────────────────────────────── */
router.post('/', auth, async (req, res) => {
  const { date, mealType, loc, dish, rice, qty } = req.body;

  if (!date || !mealType || !loc || !dish || !rice) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  if (!VALID_TYPE.includes(mealType)) return res.status(400).json({ error: '無效的 mealType' });
  if (!VALID_LOC.includes(loc))       return res.status(400).json({ error: '無效的 loc' });
  if (!VALID_DISH.includes(dish))     return res.status(400).json({ error: '無效的 dish' });
  if (!VALID_RICE.includes(rice))     return res.status(400).json({ error: '無效的 rice' });

  const qtyNum = parseInt(qty, 10);
  if (!qtyNum || qtyNum < 1 || qtyNum > 10) {
    return res.status(400).json({ error: 'qty 必須為 1～10 的整數' });
  }

  // 若 main1 有上限，檢查剩餘份數
  if (dish === 'main1') {
    const { data: menu } = await supabase
      .from('menus')
      .select('main1_limit')
      .eq('date', date)
      .single();

    if (menu?.main1_limit) {
      const { data: existing } = await supabase
        .from('orders')
        .select('qty')
        .eq('date', date)
        .eq('dish', 'main1');

      const used = (existing || []).reduce((s, o) => s + o.qty, 0);
      if (used + qtyNum > menu.main1_limit) {
        return res.status(409).json({ error: `主菜一已額滿（限 ${menu.main1_limit} 份）` });
      }
    }
  }

  const id = 'o' + Date.now() + Math.random().toString(36).slice(2, 5);

  const record = {
    id,
    emp:       req.user.emp,
    name:      req.user.name,
    dept:      req.user.dept,
    date,
    meal_type: mealType,
    loc,
    dish,
    rice,
    qty:       qtyNum,
    status:    'pending',
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(record)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ── PATCH /api/orders/:id/status ────────────────────────────
   更新訂單狀態（取餐完成），需 admin 或取餐管理頁使用
   Body: { status: "done" }
   ───────────────────────────────────────────────────────── */
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'status 必須為 pending 或 done' });
  }

  // 一般 staff 不能自己標記取餐
  if (req.user.role === 'staff') {
    return res.status(403).json({ error: '無操作權限' });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data)  return res.status(404).json({ error: '找不到此訂單' });
  res.json(data);
});

/* ── PATCH /api/orders/mark-done-by-emp ──────────────────────
   將某位員工在指定日期的所有訂單一次標記為 done（取餐管理頁用）
   Body: { emp, date }
   ───────────────────────────────────────────────────────── */
router.patch('/mark-done-by-emp', auth, requireRole('menu'), async (req, res) => {
  const emp  = (req.body.emp  || '').trim().toUpperCase();
  const date = (req.body.date || '').trim();

  if (!emp || !date) return res.status(400).json({ error: '請提供 emp 與 date' });

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'done' })
    .eq('emp', emp)
    .eq('date', date)
    .eq('status', 'pending')
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ updated: data.length, rows: data });
});

/* ── DELETE /api/orders/:id ──────────────────────────────────
   刪除單筆訂單（需 super 權限）
   ───────────────────────────────────────────────────────── */
router.delete('/:id', auth, requireRole('super'), async (req, res) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `已刪除訂單 ${req.params.id}` });
});

module.exports = router;
