-- =====================================================================
-- แสดงเฉพาะ booking/ลูกค้าที่มีปัญหาจริง (สรุปรวมจากทุกเช็คใน
-- supabase_audit_transactions_totals.sql เป็น query เดียว) — อ่านอย่าง
-- เดียว รันซ้ำได้ทุกเมื่อเพื่อเช็คสุขภาพข้อมูลเป็นระยะ
--
-- เงื่อนไขที่ถือว่า "มีปัญหา" (ไม่รวม booking สถานะ reserved ที่ยังไม่
-- เช็คอิน/ยังไม่เก็บเงินครบ เพราะเป็นเรื่องปกติของธุรกิจ):
--  1) มี transaction "ค่าห้อง" ซ้ำมากกว่า 1 ครั้งต่อ booking
--  2) มี transaction "ค่ามัดจำ" ซ้ำมากกว่า 1 ครั้งต่อ booking
--  3) รับมัดจำ (deposit > 0) แต่ไม่มี transaction "ค่ามัดจำ" เลย
--  4) เช็คอิน/เช็คเอาท์แล้ว (จบงานแล้ว) แต่ยอดรายรับที่บันทึกจริง
--     ไม่เท่ากับราคาห้อง (price) ไม่ว่าจะขาดหรือเกิน
-- =====================================================================

with booking_totals as (
  select
    b.id                                                          as booking_id,
    r.room_no,
    c.full_name                                                   as customer_name,
    b.price,
    b.deposit,
    b.status,
    coalesce(sum(t.amount) filter (where t.tx_type = 'income'), 0) as total_income_recorded,
    count(t.id) filter (where t.category = 'ค่าห้อง')              as room_fee_tx_count,
    count(t.id) filter (where t.category = 'ค่ามัดจำ')             as deposit_tx_count
  from bookings b
  left join rooms r        on b.room_id = r.id
  left join customers c    on b.customer_id = c.id
  left join transactions t on t.booking_id = b.id
  where b.status <> 'cancelled'
  group by b.id, r.room_no, c.full_name, b.price, b.deposit, b.status
)
select
  booking_id, room_no, customer_name, status, price, deposit,
  total_income_recorded,
  price - total_income_recorded as diff,
  room_fee_tx_count, deposit_tx_count,
  case
    when room_fee_tx_count > 1  then 'ซ้ำ: ค่าห้องบันทึกมากกว่า 1 ครั้ง (' || room_fee_tx_count || ' ครั้ง)'
    when deposit_tx_count > 1   then 'ซ้ำ: ค่ามัดจำบันทึกมากกว่า 1 ครั้ง (' || deposit_tx_count || ' ครั้ง)'
    when deposit > 0 and deposit_tx_count = 0
                                 then 'รับมัดจำแล้วแต่ไม่มีรายการ ค่ามัดจำ ในระบบเลย'
    when status in ('checked_in','checked_out') and price - total_income_recorded <> 0
                                 then 'จบงานแล้วแต่ยอดรายรับไม่เท่าราคาห้อง'
  end as problem
from booking_totals
where
     room_fee_tx_count > 1
  or deposit_tx_count > 1
  or (deposit > 0 and deposit_tx_count = 0)
  or (status in ('checked_in','checked_out') and price - total_income_recorded <> 0)
order by problem, abs(price - total_income_recorded) desc;


-- ---------------------------------------------------------------------
-- เพิ่มเติม: transaction ที่ tx_date เป็น NULL (ไม่ผูกกับ booking ใดๆ
-- โดยตรง จึงไม่โผล่ใน query ด้านบน) — คาดหวังว่าง 0 แถว
-- ---------------------------------------------------------------------
select id, tx_type, category, amount, note, created_at
from transactions
where tx_date is null;


-- ---------------------------------------------------------------------
-- รายละเอียดคู่รายการ "ค่าห้อง" ที่ซ้ำ (ห้อง/เวลาห่างกันกี่วินาที)
-- หาแบบไดนามิก ไม่ต้อง hardcode booking_id — ใช้ตอนอยากดูรายการซ้ำ
-- ปัจจุบันในระบบ ไม่ว่าจะเป็นชุดเดิม 8 booking หรือชุดใหม่ที่เกิดขึ้นอีก
-- (สมมติว่าซ้ำแค่ 2 ครั้งต่อ booking — ถ้าซ้ำ 3+ ครั้งจะโชว์แค่คู่แรก)
-- ---------------------------------------------------------------------
with dup as (
  select booking_id
  from transactions
  where category = 'ค่าห้อง' and booking_id is not null
  group by booking_id
  having count(*) > 1
),
ranked as (
  select
    t.booking_id,
    r.room_no,
    c.full_name as customer_name,
    t.id,
    t.amount,
    t.created_at,
    row_number() over (partition by t.booking_id order by t.created_at) as rn
  from transactions t
  join dup d           on d.booking_id = t.booking_id
  join bookings b       on b.id = t.booking_id
  left join rooms r     on b.room_id = r.id
  left join customers c on b.customer_id = c.id
  where t.category = 'ค่าห้อง'
)
select
  a.booking_id,
  a.room_no,
  a.customer_name,
  a.amount,
  a.created_at                                       as created_at_1,
  z.created_at                                       as created_at_2,
  extract(epoch from (z.created_at - a.created_at))  as seconds_apart,
  a.id                                                as tx_id_1_keep,
  z.id                                                as tx_id_2_delete
from ranked a
join ranked z on z.booking_id = a.booking_id and z.rn = a.rn + 1
where a.rn = 1
order by a.booking_id;
