-- แก้ยอดรายรับห้อง A2 (คุณอรอุมา ปัญจมาศ) วันที่ 20/06/2569 จาก 1100 เป็น 550
update transactions
set amount = 550
where id = 'c8978383-64c2-45a1-8b28-ca90d64eb343';

-- ตรวจสอบผลลัพธ์หลังแก้
select id, tx_date, amount, note
from transactions
where id = 'c8978383-64c2-45a1-8b28-ca90d64eb343';
