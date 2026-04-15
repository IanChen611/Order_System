-- ================================================================
-- 訂餐系統初始化 Migration
-- 執行方式：Supabase Dashboard → SQL Editor → 貼上執行
-- ================================================================

-- ── 菜單 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  date        DATE    PRIMARY KEY,
  main1       TEXT    NOT NULL,
  main2       TEXT    NOT NULL,
  veg         TEXT    NOT NULL,
  dinner      TEXT    NOT NULL,
  main1_limit INTEGER NOT NULL DEFAULT 80,
  holiday     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── 實習生名單 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  emp  VARCHAR(20) PRIMARY KEY,
  name TEXT        NOT NULL,
  dept TEXT        NOT NULL
);

-- ── 管理員 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  emp           VARCHAR(20) PRIMARY KEY,
  name          TEXT        NOT NULL,
  dept          TEXT        NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'menu'
                  CHECK (role IN ('super', 'menu')),
  password_hash TEXT        NOT NULL
);

-- ── 訂單 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id         VARCHAR(32)  PRIMARY KEY,
  emp        VARCHAR(20)  NOT NULL,
  name       TEXT         NOT NULL,
  dept       TEXT         NOT NULL,
  date       DATE         NOT NULL,
  meal_type  VARCHAR(10)  NOT NULL CHECK (meal_type IN ('lunch','dinner')),
  loc        VARCHAR(20)  NOT NULL CHECK (loc       IN ('douliou','huwei')),
  dish       VARCHAR(10)  NOT NULL CHECK (dish      IN ('main1','main2','veg','dinner')),
  rice       VARCHAR(10)  NOT NULL CHECK (rice      IN ('white','health')),
  qty        INTEGER      NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 10),
  status     VARCHAR(10)  NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','done')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_date   ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_emp    ON orders(emp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ── Row Level Security（RLS）─────────────────────────────────
-- 後端使用 service_role key，可繞過 RLS
-- 以下規則是防禦層，避免 anon key 直接存取資料

ALTER TABLE menus   ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders  ENABLE ROW LEVEL SECURITY;

-- 僅允許 service_role（後端）讀寫，前端 anon key 一律拒絕
CREATE POLICY "backend only" ON menus   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "backend only" ON staff   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "backend only" ON admins  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "backend only" ON orders  FOR ALL USING (auth.role() = 'service_role');

-- ── 種子資料（管理員）────────────────────────────────────────
-- 密碼使用 bcrypt hash，預設密碼 = 員編本身
-- 以下 hash 對應值：
--   Y00780 → $2a$10$... (執行前請用 seed 腳本重新產生，或在後台建立)
-- 注意：直接在 SQL 插入時，請先用 Node.js 產出 hash 再填入
-- 範例指令（在 backend 目錄執行）：
--   node -e "const b=require('bcryptjs');console.log(b.hashSync('Y00780',10))"

-- INSERT INTO admins (emp, name, dept, role, password_hash) VALUES
-- ('Y00780', '黃秋雯', '復健部',   'super', '<在此貼上 hash>'),
-- ('V00001', '林霈捷', '管理員',   'super', '<在此貼上 hash>'),
-- ('V00002', '彭家慶', '管理員',   'super', '<在此貼上 hash>');
