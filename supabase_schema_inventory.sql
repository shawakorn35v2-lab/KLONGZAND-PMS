-- =====================================================================
-- KLONGZAND PMS - Inventory Module (เพิ่มเติม)
-- รันไฟล์นี้ใน Supabase SQL Editor ต่อจาก supabase_schema.sql เดิม
-- (ไม่กระทบตารางเดิมที่รันไปแล้ว)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. INVENTORY ITEMS (รายการของใช้ + สต๊อกปัจจุบัน) — เพิ่มรายการใหม่ได้ไม่จำกัด
-- ---------------------------------------------------------------------
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'ชิ้น',   -- เช่น ขวด, ม้วน, แพ็ค, ก้อน
  current_stock numeric(10,2) not null default 0,
  reorder_point numeric(10,2) not null default 0, -- ต่ำกว่านี้ให้เตือน/ขอเพิ่ม
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into inventory_items (name, unit, reorder_point) values
  ('น้ำดื่ม', 'ขวด', 24),
  ('สบู่', 'ก้อน', 20),
  ('แชมพู', 'ขวด', 20),
  ('กระดาษทิชชู', 'ม้วน', 30)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 2. INVENTORY MOVEMENTS (ซื้อของเข้า = stock_in / เบิกของไปใช้ = stock_out)
-- ---------------------------------------------------------------------
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in','stock_out')),
  quantity numeric(10,2) not null check (quantity > 0),
  room_id uuid references rooms(id),         -- ใช้เฉพาะ stock_out: เบิกไปใช้ห้องไหน (เว้นว่างได้ถ้าเบิกใช้ทั่วไป ไม่เจาะห้อง)
  unit_cost numeric(10,2),                   -- ใช้เฉพาะ stock_in: ราคาต่อหน่วยตอนซื้อเข้า
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- trigger: อัปเดต current_stock ใน inventory_items อัตโนมัติทุกครั้งที่มีการบันทึก movement
create or replace function update_inventory_stock()
returns trigger as $$
begin
  if new.movement_type = 'stock_in' then
    update inventory_items set current_stock = current_stock + new.quantity where id = new.item_id;
  elsif new.movement_type = 'stock_out' then
    update inventory_items set current_stock = current_stock - new.quantity where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_inventory_movement on inventory_movements;
create trigger trg_inventory_movement
  after insert on inventory_movements
  for each row execute procedure update_inventory_stock();

-- ---------------------------------------------------------------------
-- 3. INVENTORY REQUESTS (ขอของใช้เพิ่มเติม — พนักงานขอ / แอดมินอนุมัติ-จัดการ)
-- ---------------------------------------------------------------------
create table if not exists inventory_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id) on delete cascade,
  requested_qty numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','fulfilled','rejected')),
  note text,
  requested_by uuid references profiles(id),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table inventory_requests enable row level security;

create policy "authenticated full access inventory_items" on inventory_items for all using (auth.role() = 'authenticated');
create policy "authenticated full access inventory_movements" on inventory_movements for all using (auth.role() = 'authenticated');
create policy "authenticated full access inventory_requests" on inventory_requests for all using (auth.role() = 'authenticated');
