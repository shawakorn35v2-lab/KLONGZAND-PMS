-- =====================================================================
-- KLONGZAND PMS - นำเข้าข้อมูลย้อนหลัง พ.ค. 2569 (May 2026) จากไฟล์รายงาน
-- รันใน Supabase SQL Editor (ครั้งเดียว) — ตรวจสอบยอดก่อนรัน
-- ไม่รวม 'รายรับเงินรายเดือน' ที่ตรงกับแถว 'รายรับห้ามใช้' เพราะเป็นเงินประกัน ไม่ใช่รายรับจริง
-- =====================================================================

insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'income', 'ค่าห้อง (เงินสด)', 2800, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'income', 'ค่าห้อง (โอน)', 11750, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-02', 'income', 'ค่าห้อง (เงินสด)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-02', 'income', 'ค่าห้อง (โอน)', 6450, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-03', 'income', 'ค่าห้อง (โอน)', 4950, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-04', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-04', 'income', 'ค่าห้อง (โอน)', 1000, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
-- ข้าม: วันที่ 2026-05-04 รายรับเงินรายเดือน 8200 บาท ถูกระบุว่าเป็น 'รายรับห้ามใช้' (เงินประกัน) จึงไม่นำเข้าเป็นรายรับ
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-07', 'income', 'ค่าห้อง (เงินสด)', 1550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-07', 'income', 'ค่าห้อง (โอน)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-08', 'income', 'ค่าห้อง (โอน)', 55, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-09', 'income', 'ค่าห้อง (เงินสด)', 2000, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-09', 'income', 'ค่าห้อง (โอน)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-10', 'income', 'ค่าห้อง (เงินสด)', 1350, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-11', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-13', 'income', 'ค่าห้อง (โอน)', 1650, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-14', 'income', 'ค่าห้อง (เงินสด)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-14', 'income', 'ค่าห้อง (โอน)', 2700, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-16', 'income', 'ค่าห้อง (โอน)', 1150, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-17', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-17', 'income', 'ค่าห้อง (โอน)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-18', 'income', 'ค่าห้อง (เงินสด)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-19', 'income', 'ค่าห้อง (เงินสด)', 850, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-19', 'income', 'ค่าห้อง (โอน)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-20', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-20', 'income', 'ค่าห้อง (โอน)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-21', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-22', 'income', 'ค่าห้อง (โอน)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-23', 'income', 'ค่าห้อง (โอน)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
-- ข้าม: วันที่ 2026-05-23 รายรับเงินรายเดือน 4100 บาท ถูกระบุว่าเป็น 'รายรับห้ามใช้' (เงินประกัน) จึงไม่นำเข้าเป็นรายรับ
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-24', 'income', 'ค่าห้อง (โอน)', 1550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-26', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-26', 'income', 'ค่าห้อง (โอน)', 1650, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-27', 'income', 'ค่าห้อง (โอน)', 1650, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-28', 'income', 'ค่าห้อง (โอน)', 300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-29', 'income', 'ค่าห้อง (เงินสด)', 550, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-29', 'income', 'ค่าห้อง (โอน)', 1650, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-29', 'income', 'ค่าน้ำ-ไฟ (วางบิลรายเดือน)', 441.77, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-30', 'income', 'ค่าห้อง (เงินสด)', 1600, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-30', 'income', 'ค่าห้อง (โอน)', 4950, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-30', 'income', 'ค่าน้ำ-ไฟ (วางบิลรายเดือน)', 2244.69, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-31', 'income', 'ค่าห้อง (เงินสด)', 2500, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-31', 'income', 'ค่าห้อง (โอน)', 4300, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-31', 'income', 'ค่าน้ำ-ไฟ (วางบิลรายเดือน)', 552.22, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');

-- รายจ่ายประจำเดือน (ยอดรวมทั้งเดือน บันทึกวันที่ 1 ของเดือน)
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'expense', 'ค่าเช่า', 20000, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'expense', 'ค่าแรงงาน', 36000, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'expense', 'ค่าน้ำประปา', 2102.92, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'expense', 'ค่าไฟฟ้า', 6248.66, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
insert into transactions (tx_date, tx_type, category, amount, note) values ('2026-05-01', 'expense', 'ค่าอินเตอร์เน็ต', 1268.93, 'นำเข้าข้อมูลย้อนหลังจากรายงาน พ.ค.2569');
