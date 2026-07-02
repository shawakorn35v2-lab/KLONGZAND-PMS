-- ตารางเก็บหมวดหมู่รายรับ/รายจ่าย ที่แอดมินจัดการเองได้
-- แทนที่ INCOME_CATEGORIES / EXPENSE_CATEGORIES ที่เคย hardcode ไว้ใน components/TransactionForm.js
create table if not exists transaction_categories (
  id uuid primary key default gen_random_uuid(),
  tx_type text not null check (tx_type in ('income', 'expense')),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (tx_type, name)
);

-- Seed หมวดหมู่เริ่มต้นให้เหมือนของเดิมที่ hardcode ไว้
insert into transaction_categories (tx_type, name, sort_order) values
  ('income', 'ค่าห้อง', 1),
  ('income', 'ค่ามัดจำ', 2),
  ('income', 'ค่าบริการ', 3),
  ('income', 'อื่นๆ', 99),
  ('expense', 'ค่าสาธารณูปโภค', 1),
  ('expense', 'ซ่อมบำรุง', 2),
  ('expense', 'วัสดุ-อุปกรณ์', 3),
  ('expense', 'เงินเดือน', 4),
  ('expense', 'อื่นๆ', 99)
on conflict (tx_type, name) do nothing;

-- ตรวจผล
select tx_type, name, sort_order from transaction_categories where is_active = true order by tx_type, sort_order;
