select
  t.id as transaction_id,
  t.tx_date,
  t.amount,
  t.note,
  t.is_closed,
  b.id as booking_id,
  b.checkin_date,
  b.checkout_date,
  r.room_no,
  c.full_name
from transactions t
left join bookings b on t.booking_id = b.id
left join rooms r on b.room_id = r.id
left join customers c on b.customer_id = c.id
where t.tx_date in ('2026-06-20','2026-06-21')
  and t.amount in (1100, 550, 1030.42)
order by t.tx_date, t.amount;
