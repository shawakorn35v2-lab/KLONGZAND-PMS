-- =====================================================================
-- KLONGZAND PMS - ห้องพักชั่วคราว (เพิ่มเติม)
-- รันไฟล์นี้ใน Supabase SQL Editor ต่อจากไฟล์เดิม (ไม่กระทบตารางเดิม)
-- รองรับ: ห้องเดียวกันรับได้หลายรอบต่อวัน ระบุเวลาเข้า-ออกจริง ราคาคงที่ต่อรอบ
-- =====================================================================

-- 1. บอกประเภทการจอง: ค้างคืน (overnight) หรือ ชั่วคราว (temporary)
alter table bookings add column if not exists stay_type text not null default 'overnight'
  check (stay_type in ('overnight','temporary'));

-- 2. เวลาเข้า-ออกจริง (ใช้เฉพาะตอน stay_type = 'temporary' เพื่อกันชนรอบในวันเดียวกัน)
alter table bookings add column if not exists checkin_time time;
alter table bookings add column if not exists checkout_time time;
