-- หารายการ "ขาย" ที่ตอนนี้ไม่มีรายรับผูกอยู่แล้ว (เพราะรายรับถูกลบไปแล้ว) แต่สต๊อกยังถูกหักอยู่
select
  m.id as movement_id,
  m.movement_type,
  m.quantity,
  m.transaction_id,
  m.created_at,
  i.id as item_id,
  i.name as item_name,
  i.current_stock,
  i.unit
from inventory_movements m
join inventory_items i on m.item_id = i.id
where m.movement_type = 'sale'
  and m.transaction_id is null
order by m.created_at desc
limit 10;
