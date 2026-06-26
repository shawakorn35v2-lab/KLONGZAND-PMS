-- =====================================================================
-- ตรวจสอบรายการจองห้องชั่วคราว ที่ราคา/มัดจำดูเหมือนเพี้ยนจากเลขกลม ๆ
-- (เช่น 300.00 → 299.99 / 299.98 หรือ → 300.01 / 300.02)
-- เป็น query แบบอ่านอย่างเดียว ไม่มีการแก้ไขข้อมูล
-- =====================================================================

-- 1) นับจำนวนรายการที่ปลายเลขเป็น .99 / .98 (น่าจะตั้งใจเป็น .00) หรือ .01 / .02 (น่าจะตั้งใจเป็น .00)
select
  count(*) filter (where round(price * 100)::int % 100 in (99, 98, 1, 2)) as suspicious_price_count,
  count(*) filter (where round(deposit * 100)::int % 100 in (99, 98, 1, 2)) as suspicious_deposit_count,
  count(*) as total_temporary_bookings
from bookings
where stay_type = 'temporary'
  and status <> 'cancelled';

-- 2) ดูรายการที่น่าจะผิดแบบเจาะจง (เพื่อให้ผู้ใช้ตรวจสอบรายตัวก่อนสั่งแก้ไข)
select
  b.id,
  b.checkin_date,
  b.checkin_time,
  b.checkout_time,
  r.room_no,
  c.full_name as customer_name,
  b.price,
  b.deposit,
  b.status,
  b.created_at
from bookings b
left join rooms r on r.id = b.room_id
left join customers c on c.id = b.customer_id
where b.stay_type = 'temporary'
  and (
    round(b.price * 100)::int % 100 in (99, 98, 1, 2)
    or round(b.deposit * 100)::int % 100 in (99, 98, 1, 2)
  )
order by b.checkin_date desc, b.checkin_time desc;
