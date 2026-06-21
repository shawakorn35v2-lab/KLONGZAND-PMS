-- =====================================================================
-- KLONGZAND PMS - สินค้าขาย (เพิ่มเติม)
-- รันไฟล์นี้ใน Supabase SQL Editor ต่อจากไฟล์เดิม (ไม่กระทบตารางเดิม)
-- รองรับ: ของที่ซื้อมาเพื่อขายต่อ (เช่น ขนม น้ำอัดลม) มีราคาขาย
-- ขายแล้วหักสต๊อกอัตโนมัติ + สร้างรายรับอัตโนมัติ เชื่อมกันด้วย transaction_id
-- =====================================================================

-- 1. ทำเครื่องหมายว่ารายการของไหน "เป็นสินค้าขาย" และตั้งราคาขายไว้ล่วงหน้า
alter table inventory_items add column if not exists is_for_sale boolean default false;
alter table inventory_items add column if not exists sale_price numeric(10,2);

-- 2. เชื่อม movement การขาย เข้ากับรายการรายรับที่เกิดขึ้นพร้อมกัน
alter table inventory_movements add column if not exists transaction_id uuid references transactions(id) on delete set null;

-- 3. เพิ่มประเภท movement ใหม่ 'sale' (ขาย) แยกจาก stock_out (เบิกใช้ภายใน)
alter table inventory_movements drop constraint if exists inventory_movements_movement_type_check;
alter table inventory_movements add constraint inventory_movements_movement_type_check
  check (movement_type in ('stock_in','stock_out','sale'));

-- 4. อัปเดต trigger ให้หักสต๊อกเมื่อ movement_type = 'sale' ด้วย (เหมือน stock_out)
create or replace function update_inventory_stock()
returns trigger as $$
begin
  if new.movement_type = 'stock_in' then
    update inventory_items set current_stock = current_stock + new.quantity where id = new.item_id;
  elsif new.movement_type in ('stock_out','sale') then
    update inventory_items set current_stock = current_stock - new.quantity where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;
