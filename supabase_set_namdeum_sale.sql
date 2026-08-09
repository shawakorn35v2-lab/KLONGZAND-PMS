-- ตั้งให้ "น้ำดื่ม" เป็นได้ทั้งของใช้ในห้อง (เบิกใช้) และของขาย (เบิกมาขาย) ใช้สต๊อกร่วมกันก้อนเดียว
update inventory_items
set is_for_sale = true,
    sale_price = 10
where name = 'น้ำดื่ม';
