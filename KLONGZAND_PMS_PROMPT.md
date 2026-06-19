# PROMPT สำหรับ Claude ใน VS Code — สร้างระบบ KLONGZAND PMS

คัดลอกข้อความทั้งหมดด้านล่างนี้ วางใน Claude (VS Code extension) ที่ root ของ repo โปรเจกต์

---

ฉันต้องการให้คุณสร้างเว็บแอประบบจัดการรีสอร์ทชื่อ **"KLONGZAND PMS"** ให้ครบทั้งระบบ ในโปรเจกต์นี้ (repo นี้คือ GitHub repo ที่เชื่อม Vercel ไว้แล้ว: https://github.com/shawakorn35v2-lab/KLONGZAND-PMS.git ) กรุณาทำตามสเปกด้านล่างทั้งหมด

## 1. Tech Stack
- Next.js (App Router, JavaScript, ไม่ใช้ TypeScript)
- Tailwind CSS สำหรับ styling
- Supabase สำหรับ Database + Auth (ใช้ `@supabase/supabase-js` และ `@supabase/ssr`)
- Deploy บน Vercel (โค้ดต้อง build ผ่านด้วย `next build` ไม่มี error)
- ใช้ `recharts` สำหรับกราฟในหน้า Dashboard
- ภาษา UI ทั้งหมดเป็น**ภาษาไทย** แสดงตัวเลขเงินเป็นหน่วยบาท

## 2. Database — ใช้ schema ที่มีอยู่แล้ว ห้ามสร้างตารางใหม่เอง
ฉันรัน SQL schema ไว้ใน Supabase แล้วจากไฟล์ `supabase_schema.sql` และ `supabase_schema_inventory.sql` (อยู่ใน repo นี้ที่ root) ให้คุณอ่านไฟล์ทั้งสองเพื่อเข้าใจโครงสร้างตารางทั้งหมดก่อนเขียนโค้ด ตารางที่มี:

- `profiles` (id, full_name, role: 'admin' | 'staff')
- `rooms` (room_no, building, room_type, price_per_night, is_monthly, monthly_rent, housekeeping_status: 'clean'|'dirty'|'maintenance', is_active) — มีข้อมูล 19 ห้องอยู่แล้ว: A1-A7, B1-B6, C1-C6
- `customers` (full_name, phone, note)
- `bookings` (room_id, customer_id, channel: 'walkin'|'agoda'|'line'|'facebook'|'sale', checkin_date, checkout_date, price, deposit, status: 'reserved'|'checked_in'|'checked_out'|'cancelled', note)
- `transactions` (tx_date, tx_type: 'income'|'expense', category, amount, note, booking_id, is_closed)
- `daily_closings` (closing_date, total_income, total_expense, net_amount, closed_by, closed_at)
- `meter_readings` (room_id, billing_month, prev_reading, curr_reading, unit_price, water_flat_fee, electric_cost [generated], total_amount [generated]) — ใช้เฉพาะห้องที่ `is_monthly = true`
- `housekeeping_log` (room_id, status, note, updated_by, updated_at)
- `inventory_items` (name, unit, current_stock, reorder_point) — รายการของใช้ (น้ำดื่ม, สบู่, แชมพู, กระดาษทิชชู ฯลฯ) เพิ่มรายการใหม่ได้ไม่จำกัด
- `inventory_movements` (item_id, movement_type: 'stock_in'|'stock_out', quantity, room_id [ใช้เฉพาะ stock_out เบิกไปใช้ห้องไหน], unit_cost [ใช้เฉพาะ stock_in], note) — มี trigger อัปเดต current_stock อัตโนมัติ ไม่ต้องคำนวณซ้ำใน frontend
- `inventory_requests` (item_id, requested_qty, status: 'pending'|'approved'|'fulfilled'|'rejected', requested_by, resolved_by) — คำขอของใช้เพิ่มเติม

## 3. Environment Variables
มีไฟล์ `.env.local.example` อยู่แล้วใน repo ให้ใช้ตัวแปรชื่อ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ในการสร้าง Supabase client (อย่าฮาร์ดโค้ดค่าใด ๆ ไว้ในโค้ด)

## 4. Authentication & สิทธิ์ผู้ใช้งาน
- หน้า `/login` ใช้ Supabase Auth (`signInWithPassword`) — อีเมล/รหัสผ่าน
- สร้าง `middleware.js` ป้องกันทุก route ยกเว้น `/login` — ถ้ายังไม่ login ให้ redirect ไป `/login`
- ดึง `role` จากตาราง `profiles` ของผู้ใช้ที่ login:
  - **admin**: เข้าถึงได้ทุกหน้า ทุกฟีเจอร์ รวมรายงานการเงินทั้งหมด
  - **staff**: เข้าถึงหน้าจองห้อง, ลูกค้า, กรอกรายรับ-รายจ่ายประจำวัน, ทำความสะอาดห้องได้ แต่**ดูรายงานสรุปการเงินรวม/Dashboard เชิงลึกไม่ได้** (ซ่อนหรือ disable เมนูเหล่านั้น)
- มีปุ่ม Logout ใน layout หลัก

## 5. หน้าเว็บที่ต้องสร้าง

### `/dashboard` (หน้าแรกหลัง login)
- สรุปยอดรายรับ / รายจ่าย / กำไรสุทธิ ของวันนี้ และเดือนนี้
- สถานะห้องพักวันนี้ (ว่าง / มีลูกค้าเข้าพัก / ทำความสะอาด) แสดงเป็น grid 19 ห้อง พร้อมสีบอกสถานะ
- กราฟยอดขายรายเดือน (แท่งหรือเส้น) ใช้ recharts ดึงจาก `transactions` ที่ `tx_type = 'income'`
- กราฟ/ตารางสรุปยอดขายแยกตามช่องทาง (walk-in / Agoda / Line / Facebook / Sale) จากตาราง `bookings.channel`
- Occupancy rate (% ห้องที่มีลูกค้าวันนี้ / 19 ห้อง)

### `/rooms` (จัดการห้องพัก)
- ตารางแสดง 19 ห้อง พร้อมแก้ไขราคา/ประเภท/สถานะแม่บ้านได้ (admin เท่านั้นแก้ราคา)
- toggle เปิด/ปิด `is_monthly` ต่อห้อง พร้อมตั้งค่า `monthly_rent`
- ลิงก์ไปหน้ามิเตอร์ของห้องที่เป็นรายเดือน

### `/rooms/[id]/meter` (มิเตอร์ไฟ + ค่าน้ำเหมา — เฉพาะห้องรายเดือน)
- กรอกเลขมิเตอร์ก่อน-หลังของแต่ละเดือน, ตั้งราคาต่อหน่วย, ค่าน้ำเหมา
- แสดงผลคำนวณค่าไฟ และยอดรวมทั้งหมด (ใช้ generated columns ที่มีอยู่แล้วในฐานข้อมูล ไม่ต้องคำนวณซ้ำใน frontend)
- ประวัติมิเตอร์ย้อนหลังของห้องนั้น (list ทุกเดือน)

### `/bookings` (จองห้องพัก)
- ฟอร์มสร้างการจองใหม่: เลือกห้อง, ลูกค้า (เลือกจากเดิมหรือเพิ่มใหม่), วันเข้า-ออก, ช่องทาง (walk-in/Agoda/Line/Facebook/Sale), ราคา, มัดจำ
- ปฏิทิน/ตารางการจอง แสดงห้อง x วันที่ ดูได้ว่าห้องไหนว่าง/ไม่ว่างช่วงไหน
- ปุ่มเช็คอิน / เช็คเอาท์ เปลี่ยนสถานะ booking และอัปเดตสถานะห้อง (housekeeping_status เป็น 'dirty' หลังเช็คเอาท์)
- เมื่อเช็คอิน/ยืนยันชำระเงิน ให้สร้างรายการใน `transactions` (tx_type='income') อัตโนมัติ ผูกกับ `booking_id`

### `/customers` (ลูกค้า + ประวัติ)
- รายชื่อลูกค้าทั้งหมด ค้นหาได้ด้วยชื่อ/เบอร์โทร
- หน้ารายละเอียดลูกค้า แสดงประวัติการเข้าพักทั้งหมด (join จาก `bookings`)

### `/transactions` (รายรับ-รายจ่ายประจำวัน)
- ฟอร์มกรอกรายรับ/รายจ่ายเอง (เช่น ค่าน้ำไฟ ค่าซ่อมบำรุง ค่าใช้จ่ายอื่น ๆ) พร้อมหมวดหมู่
- รายการของวันนี้ พร้อมยอดรวมรายรับ/รายจ่าย/กำไรสุทธิแบบ real-time
- ปุ่ม **"ปิดยอดประจำวัน"** — กดได้หลัง 23:59 ของวันนั้น (หรือ admin กดเองได้ทุกเวลาเพื่อทดสอบ) — เมื่อกดแล้ว: สร้าง record ใน `daily_closings`, set `transactions.is_closed = true` สำหรับวันนั้นทั้งหมด และห้ามแก้ไข/ลบรายการของวันที่ปิดยอดแล้ว (ทั้ง backend ผ่าน RLS/policy logic และ disable ปุ่มแก้ไขใน UI)
- ตัวกรองดูย้อนหลังตามช่วงวันที่ พร้อมยอดสรุป

### `/housekeeping` (สถานะแม่บ้าน/ทำความสะอาด)
- รายการห้องทั้งหมดพร้อมสถานะปัจจุบัน (clean/dirty/maintenance)
- กดเปลี่ยนสถานะได้ ทุกครั้งที่เปลี่ยนให้บันทึก log ลง `housekeeping_log`
- ดูประวัติการเปลี่ยนสถานะของแต่ละห้องได้

### `/inventory` (สต๊อกของใช้)
- หน้าหลัก: รายการของใช้ทั้งหมด (เริ่มมี น้ำดื่ม, สบู่, แชมพู, กระดาษทิชชู — เพิ่ม/แก้ไข/ลบรายการใหม่ได้ไม่จำกัด) แสดงจำนวนสต๊อกปัจจุบัน (`current_stock`) ไฮไลท์สีแดงถ้าต่ำกว่า `reorder_point`
- ฟอร์ม **"ซื้อของเข้า/รับเข้าสต๊อก"**: เลือกของใช้, จำนวน, ราคาต่อหน่วย, บันทึก → insert ลง `inventory_movements` (movement_type='stock_in')
- ฟอร์ม **"เบิกของไปใช้"**: เลือกของใช้, จำนวน, **เลือกห้องที่เบิกไปใช้** (dropdown 19 ห้อง, เลือกไม่เจาะห้องก็ได้), บันทึกผู้เบิก → insert ลง `inventory_movements` (movement_type='stock_out')
- ตารางประวัติการเบิก/รับเข้าทั้งหมด กรองตามช่วงวันที่ / ห้อง / รายการของใช้ได้
- ฟอร์ม **"ขอของใช้เพิ่มเติม"**: พนักงานเลือกของใช้ที่ใกล้หมด+จำนวนที่ขอ → สร้าง record สถานะ 'pending' ใน `inventory_requests` — แอดมินกดเปลี่ยนสถานะเป็น approved/fulfilled/rejected ได้ในหน้าเดียวกัน

### Export รายงาน (Excel/PDF)
- ในหน้า `/transactions` และ `/dashboard` ให้มีปุ่ม "Export Excel" และ "Export PDF" สำหรับสรุปรายรับ-รายจ่ายตามช่วงวันที่ที่เลือก
- ใช้ไลบรารี `xlsx` (SheetJS) สำหรับ Excel และ `jspdf` + `jspdf-autotable` สำหรับ PDF (ฝั่ง client-side พอ ไม่ต้องทำ server-side)

## 6. UI/Layout
- มี sidebar navigation ถาวร: Dashboard, จองห้องพัก, ห้องพัก, ลูกค้า, รายรับ-รายจ่าย, ทำความสะอาด (และซ่อนเมนูที่ staff ไม่มีสิทธิ์)
- Responsive ใช้งานบนจอคอมพิวเตอร์และแท็บเล็ตได้ดี
- ใช้สีและ badge บอกสถานะห้อง/การจองให้ดูง่าย (เขียว=ว่าง, แดง=ไม่ว่าง, เหลือง=ทำความสะอาด)

## 7