-- =====================================================================
-- ดูข้อมูลรายรับ-รายจ่ายในช่วงวันที่ที่กำหนด (อ่านอย่างเดียว)
-- แก้ช่วงวันที่ตรง where tx_date between '...' and '...' ก่อนรันทุกครั้ง
-- รูปแบบวันที่: 'YYYY-MM-DD'
-- =====================================================================

-- ---------------------------------------------------------------------
-- [A] รายการละเอียดทุกแถวในช่วงวันที่ พร้อมห้อง/ลูกค้า (ถ้ามี booking ผูกอยู่)
-- ---------------------------------------------------------------------
select
  t.tx_date,
  t.tx_type,
  t.category,
  t.amount,
  r.room_no,
  c.full_name as customer_name,
  t.note,
  t.created_at,
  t.id
from transactions t
left join bookings b  on b.id = t.booking_id
left join rooms r     on b.room_id = r.id
left join customers c on b.customer_id = c.id
where t.tx_date between '2026-06-01' and '2026-06-30'
order by t.tx_date, t.created_at;


-- ---------------------------------------------------------------------
-- [B] สรุปยอดรายวันในช่วงเดียวกัน (เอาไว้เช็คยอดเร็ว ๆ ต่อวัน)
-- ---------------------------------------------------------------------
select
  tx_date,
  count(*)                                                    as records,
  coalesce(sum(amount) filter (where tx_type = 'income'),  0) as income,
  coalesce(sum(amount) filter (where tx_type = 'expense'), 0) as expense,
  coalesce(sum(amount) filter (where tx_type = 'income'),  0)
    - coalesce(sum(amount) filter (where tx_type = 'expense'), 0) as net_profit
from transactions
where tx_date between '2026-06-01' and '2026-06-30'
group by tx_date
order by tx_date;


-- ---------------------------------------------------------------------
-- [C] ยอดรวมทั้งช่วง (ตัวเลขเดียว) — ใช้ RPC ตัวเดียวกับที่หน้าเว็บใช้
-- ---------------------------------------------------------------------
select * from get_transaction_totals('2026-06-01', '2026-06-30', null);


-- ---------------------------------------------------------------------
-- [D] การจอง (bookings) ในช่วงวันที่ (กรองจาก checkin_date) — ใช้ถ้าอยาก
-- ดูรายการจอง/เข้าพัก แทนรายรับ-รายจ่าย
-- ---------------------------------------------------------------------
select
  b.checkin_date, b.checkout_date, b.stay_type,
  r.room_no, c.full_name as customer_name,
  b.channel, b.price, b.deposit, b.status, b.note
from bookings b
left join rooms r     on b.room_id = r.id
left join customers c on b.customer_id = c.id
where b.checkin_date between '2026-06-01' and '2026-06-30'
order by b.checkin_date;
