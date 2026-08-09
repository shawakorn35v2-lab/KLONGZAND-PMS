-- ระบบใบเสร็จรับเงิน KLONGZAND RESORT
-- ตาราง receipts: เก็บหัวใบเสร็จ
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique,           -- รูปแบบ RC-YYYYMMDD-001
  booking_id uuid references bookings(id) on delete set null,  -- ผูกกับการจอง (optional)
  customer_name text not null default '',
  customer_address text not null default '',
  customer_tel text not null default '',
  customer_tax_id text not null default '',
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'transfer', 'other')),
  payment_other_note text not null default '',
  remark text not null default '',
  subtotal numeric(15,2) not null default 0,    -- ยอดรวมก่อนส่วนลด
  discount numeric(15,2) not null default 0,    -- ส่วนลด
  total_amount numeric(15,2) not null default 0, -- ยอดรับจริง (subtotal - discount)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ตาราง receipt_items: เก็บรายการในใบเสร็จ (สูงสุด 10 รายการตามแบบฟอร์ม)
create table if not exists receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  sort_order int not null default 0,
  description text not null default '',
  quantity numeric(10,2) not null default 1,
  unit_price numeric(15,2) not null default 0,
  amount numeric(15,2) not null default 0,   -- quantity * unit_price (คำนวณในแอพ)
  created_at timestamptz default now()
);

-- index เพื่อ query เร็ว
create index if not exists idx_receipts_created_at on receipts(created_at desc);
create index if not exists idx_receipts_booking_id on receipts(booking_id);
create index if not exists idx_receipt_items_receipt_id on receipt_items(receipt_id);

-- RLS
alter table receipts enable row level security;
alter table receipt_items enable row level security;

-- receipts: ทุก role ที่ login แล้วเห็นทั้งหมด (admin + staff)
create policy "receipts_select" on receipts for select
  to authenticated using (true);

-- receipts: สร้างได้ทุก role
create policy "receipts_insert" on receipts for insert
  to authenticated with check (true);

-- receipts: แก้ไขได้เฉพาะ admin หรือ creator
create policy "receipts_update" on receipts for update
  to authenticated using (
    auth.jwt() ->> 'role' = 'admin' OR created_by = auth.uid()
  );

-- receipts: ลบได้เฉพาะ admin
create policy "receipts_delete" on receipts for delete
  to authenticated using (
    auth.jwt() ->> 'role' = 'admin'
  );

-- receipt_items: ทุก policy ตาม receipts parent
create policy "receipt_items_select" on receipt_items for select
  to authenticated using (true);

create policy "receipt_items_insert" on receipt_items for insert
  to authenticated with check (true);

create policy "receipt_items_update" on receipt_items for update
  to authenticated using (true);

create policy "receipt_items_delete" on receipt_items for delete
  to authenticated using (true);

-- ตรวจผล
select 'receipts' as table_name, count(*) as rows from receipts
union all
select 'receipt_items', count(*) from receipt_items;
