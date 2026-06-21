-- =====================================================================
-- KLONGZAND PMS - Monthly Room Dates (เพิ่มเติม)
-- รันไฟล์นี้ใน Supabase SQL Editor ต่อจากไฟล์เดิม (ไม่กระทบตารางเดิม)
-- เพิ่มวันที่เข้าพักของห้องรายเดือน + วันที่กำหนดออก (ไม่ใส่ = ไม่มีกำหนดออก)
-- =====================================================================

alter table rooms add column if not exists monthly_start_date date;  -- วันที่เริ่มเข้าพักรายเดือน
alter table rooms add column if not exists monthly_end_date date;    -- วันที่กำหนดออก (NULL = ไม่มีกำหนดออก)
