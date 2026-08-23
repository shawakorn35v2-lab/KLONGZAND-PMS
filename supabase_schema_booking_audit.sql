-- ============================================
-- ตารางบันทึกประวัติการแก้ไขการจอง (booking_edits)
-- ใช้ตามรอยว่าใครแก้ข้อมูลการจอง แก้อะไร เมื่อไหร่
-- ============================================

create table if not exists booking_edits (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  field_name   text not null,          -- ชื่อฟิลด์ที่แก้ เช่น 'price', 'deposit', 'checkin_date'
  old_value    text,                   -- ค่าเดิม
  new_value    text,                   -- ค่าใหม่
  edited_by    uuid references profiles(id),
  edited_at    timestamptz not null default now(),
  reason       text                    -- เหตุผล (ถ้ามี)
);

create index if not exists booking_edits_booking_id_idx on booking_edits(booking_id);
create index if not exists booking_edits_edited_at_idx  on booking_edits(edited_at desc);

-- ============================================
-- RLS
-- ============================================

alter table booking_edits enable row level security;

-- ทุก authenticated เห็นได้ทั้งหมด (แสดง timeline)
drop policy if exists "booking_edits_select" on booking_edits;
create policy "booking_edits_select" on booking_edits for select
  to authenticated using (true);

-- ทุก authenticated สร้างได้ (server action เขียนตอน update การจอง)
drop policy if exists "booking_edits_insert" on booking_edits;
create policy "booking_edits_insert" on booking_edits for insert
  to authenticated with check (true);

-- ห้ามแก้/ลบ (append-only)
-- ไม่สร้าง policy update/delete = ทำไม่ได้

-- ============================================
-- เพิ่ม column ติดตามการแก้ไขล่าสุดในตาราง bookings
-- ============================================

alter table bookings add column if not exists updated_at timestamptz;
alter table bookings add column if not exists updated_by uuid references profiles(id);

-- ============================================
-- ตรวจผล
-- ============================================
select 'booking_edits' as table_name, count(*) as rows from booking_edits;
