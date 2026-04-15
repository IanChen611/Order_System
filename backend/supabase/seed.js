/**
 * 產出管理員種子 SQL
 * 執行：node supabase/seed.js
 * 將輸出的 SQL 貼到 Supabase SQL Editor 執行
 */
const bcrypt = require('bcryptjs');

const ADMINS = [
  { emp: 'Y00780', name: '黃秋雯', dept: '復健部',     role: 'super' },
  { emp: 'Y01533', name: '郭珮君', dept: '護理部',     role: 'menu'  },
  { emp: 'Y04315', name: '陳嘉雯', dept: '影像醫學部', role: 'menu'  },
  { emp: 'Y05763', name: '黃瓊慧', dept: '營養室',     role: 'menu'  },
  { emp: 'Y09250', name: '林宥蓁', dept: '營養室',     role: 'menu'  },
  { emp: 'V00001', name: '林霈捷', dept: '管理員',     role: 'super' },
  { emp: 'V00002', name: '彭家慶', dept: '管理員',     role: 'super' },
];

const DEFAULT_PASSWORD = '000';

async function main() {
  // 所有帳號共用同一個 hash，只需運算一次
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const rows = ADMINS.map(a =>
    `('${a.emp}', '${a.name}', '${a.dept}', '${a.role}', '${hash}')`
  );

  console.log('-- 貼到 Supabase SQL Editor 執行');
  console.log('INSERT INTO admins (emp, name, dept, role, password_hash) VALUES');
  console.log(rows.join(',\n'));
  console.log('ON CONFLICT (emp) DO UPDATE SET');
  console.log('  name = EXCLUDED.name,');
  console.log('  dept = EXCLUDED.dept,');
  console.log('  role = EXCLUDED.role,');
  console.log('  password_hash = EXCLUDED.password_hash;');
}

main();
