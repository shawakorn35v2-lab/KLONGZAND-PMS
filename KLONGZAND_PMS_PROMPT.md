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
  - **staff**: เข้าถึงหน้าจองห้อง, ลูกค้า, กรอกรายรับ-รายจ่ายประจำวัน, ทำความสะอาดห้องได้ แต่**ดูรายงานสรุปการเงินรวม/Dashboard เชิงลึกไม่ได้** (ซ่อนหรือ disable เมนูเหล่านั้น); **staff โยกห้อง (แก้ไขการจอง/เปลี่ยนห้อง) ได้** แต่ลบการจองไม่ได้
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
- ฟอร์มสร้างการจองใหม่: **ประเภทการพัก** radio — "พักค้างคืน" (stay_type='overnight', checkin/checkout date แบบเดิม) หรือ "พักชั่วคราว" (stay_type='temporary', date + checkin_time + checkout_time วันเดียวกัน)
- ห้องเดียวกันรับ **หลายรอบชั่วคราว** ในวันเดียวกันได้ (ตราบเท่าที่เวลาไม่ทับซ้อน); server-side conflict check ใน `createBooking` (`app/actions/bookings.js`)
- ปฏิทิน/ตารางห้องว่าง: แสดง 7 วัน, **วันนี้อยู่กลาง (offset -3)**, เลื่อนซ้าย-ขวาได้ทีละ 7 วัน, ปุ่ม "วันนี้" reset กลับ; temporary booking ใช้ checkin_date เดียวกันสำหรับการแรเงา
- **กรองช่วงวันที่** ในรายการจอง (dateFrom/dateTo กรอง checkin_date ที่ server)
- ปุ่มเช็คอิน / เช็คเอาท์ เปลี่ยนสถานะ booking และอัปเดตสถานะห้อง (housekeeping_status เป็น 'dirty' หลังเช็คเอาท์)
- เมื่อเช็คอิน/ยืนยันชำระเงิน ให้สร้างรายการใน `transactions` (tx_type='income') อัตโนมัติ ผูกกับ `booking_id`
- **Admin/Staff แก้ราคา/มัดจำ/โยกห้อง**: `adminUpdateBooking` (`app/actions/bookings.js`) อนุญาต role 'admin' และ 'staff' — อัปเดต transaction amounts อัตโนมัติ (ค่ามัดจำ = deposit ใหม่, ค่าห้อง = price - deposit ใหม่) — ป้องกัน A2-style desync; staff เห็นปุ่ม ✏ แก้ไข แต่ไม่เห็นปุ่ม 🗑 ลบ
- **Admin ลบการจอง**: ลบ transactions ทั้งหมด (รวมปิดยอด) ก่อนลบ booking พร้อม popup เตือนเมื่อมี closed transactions
- **checkin_time/checkout_time**: ฟิลด์ type `time` ใน DB — ต้องส่งเป็น `null` (ไม่ใช่ `""`) สำหรับ stay_type='overnight'; `openEdit` ใน BookingsClient.js initialize ด้วย `?? null`; server action ใช้ `stay_type === 'temporary' ? (value || null) : null` เป็น guard

### `/customers` (ลูกค้า + ประวัติ)
- รายชื่อลูกค้าทั้งหมด ค้นหาได้ด้วยชื่อ/เบอร์โทร
- หน้ารายละเอียดลูกค้า แสดงประวัติการเข้าพักทั้งหมด (join จาก `bookings`)

### `/transactions` (รายรับ-รายจ่ายประจำวัน + บันทึกขายของ)
- ฟอร์มกรอกรายรับ/รายจ่ายเอง (เช่น ค่าน้ำไฟ ค่าซ่อมบำรุง ค่าใช้จ่ายอื่น ๆ) พร้อมหมวดหมู่
- รายการของวันนี้ พร้อมยอดรวมรายรับ/รายจ่าย/กำไรสุทธิแบบ real-time
- ปุ่ม **"ปิดยอดประจำวัน"** — กดได้หลัง 23:59 ของวันนั้น (หรือ admin กดเองได้ทุกเวลาเพื่อทดสอบ) — เมื่อกดแล้ว: สร้าง record ใน `daily_closings`, set `transactions.is_closed = true` สำหรับวันนั้นทั้งหมด
- **สิทธิ์แก้ไข/ลบรายการปิดยอด**: staff ลบรายการ `is_closed = true` ไม่ได้ (ปุ่มซ่อน); admin ลบได้แต่ต้องยืนยัน popup ก่อน — ปุ่มแสดงเป็นสีส้มเพื่อบ่งบอกว่าเป็นรายการปิดยอดแล้ว; backend `deleteTransaction` ตรวจ role ก่อนอนุญาต (`app/actions/transactions.js`)
- ตัวกรองดูย้อนหลังตามช่วงวันที่ พร้อมยอดสรุป
- ตารางมีคอลัมน์ **"ห้อง"** — query ด้วย `select('*, bookings(room_id, rooms(room_no))')` แล้ว flatten เป็น `room_no` ก่อนส่งไป client; แสดงเลขห้องสำหรับรายการที่มี `booking_id` และ `—` สำหรับรายการที่ไม่มี (รายจ่ายทั่วไป, ขายของ)
- รายการอัตโนมัติจากการจอง/เช็คอินมีเลขห้องในช่อง `note` ด้วย เช่น `มัดจำการจองห้อง ห้อง A2`, `รับเงินเช็คอิน ห้อง A2 (ส่วนที่เหลือ)` — สร้างใน `app/actions/bookings.js` (`createBooking` และ `checkinBooking`)

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

## 7. ข้อกำหนดทางเทคนิค
- ทุก Server Action ให้ใช้ `'use server'` และ `revalidatePath()` หลัง mutation
- ทุก Client Component ที่กดปุ่มแล้วเรียก Server Action ให้ใช้ `router.refresh()` เพื่อ sync ข้อมูล
- ห้าม hardcode ค่า environment variable ใดๆ ในโค้ด
- ทุกหน้าต้อง build ผ่านด้วย `next build` ไม่มี error
- UI ทั้งหมด responsive รองรับมือถือ (md: breakpoint สำหรับ sidebar)

## 8. สถานะที่สร้างแล้ว (อัปเดต 2026-06-24)
หน้าและฟีเจอร์ที่สร้างเสร็จแล้วในโปรเจกต์นี้:
- ✅ `/login` — Supabase Auth login
- ✅ `/dashboard` — สรุปยอดวันนี้/เดือนนี้, RoomGrid, กราฟ recharts, Export Excel/PDF, ภาพรวมสะสมทั้งหมด (all-time income/expense/net/booking count), Occupancy เรียลไทม์ (date-based: checkin_date ≤ today < checkout_date หรือ is_monthly room), Occupancy รายเดือน (dropdown เลือกเดือน, แสดงห้อง-คืน, คำนวณจาก bookings + monthly rooms ทุกวันในเดือน), กราฟอัตราเข้าพักรายเดือน 12 เดือน (BarChart)
- ✅ `/bookings` — จอง/เช็คอิน/เช็คเอาท์, ตารางห้องว่าง 7 วัน, ค้นหาห้องว่างตามช่วงวันที่, อัปโหลดบัตรประชาชน/ทะเบียนรถ (Supabase Storage bucket `booking-documents`); **คลิกช่องสีแดงในตารางสถานะห้อง 7 วัน** → popup โชว์รายละเอียดการจองของห้อง-วันนั้น (ชื่อลูกค้า, เบอร์, เช็คอิน/เช็คเอาท์ + เวลา ถ้า temporary, ราคา, มัดจำ, ช่องทาง, สถานะ, หมายเหตุ) + ปุ่ม "✏ แก้ไขการจองนี้" เรียก `openEdit(b)` เดิมเปิด edit modal ทันที; รองรับหลาย bookings ต่อ cell (เช่น overnight+temporary ทับวันเดียวกัน) ด้วย `occupiedMap` คู่กับ `occupiedSet` ใน `BookingsClient.js`; **จองหลายห้องในชื่อลูกค้าเดียว**: `BookingForm.js` เปลี่ยนจาก `form.roomId/price/deposit` (เดี่ยว) → `form.rooms: [{roomId, price, deposit}]` (array) — ลูกค้า/วันที่/ช่องทาง/เอกสาร share ทุกห้อง, ราคา+มัดจำกรอกแยกต่อห้อง, ปุ่ม "+ เพิ่มห้อง"/"ลบห้องนี้", dropdown แต่ละแถวกรองห้องที่เลือกในแถวอื่นออก; server action ใหม่ `createMultiBookings` (`app/actions/bookings.js`) — pre-flight conflict check ทุกห้องด้วย batch query (`.in('room_id', roomIds)` + overlap), ถ้ามีห้องไม่ว่างยกเลิกทั้งหมดทันที (return error พร้อมเลขห้องที่ชน); ผ่านแล้ว find-or-create customer ครั้งเดียว, loop insert N bookings + N transaction มัดจำ ผูก `customer_id` เดียวกัน; ถ้า insert พังกลางทาง rollback ลบ transactions+bookings ที่สร้างไปแล้วทั้งหมด (best-effort เพราะ Supabase JS ไม่รองรับ DB transaction); `createBooking` เดิมไม่แตะ — admin edit modal และ flow อื่นใช้ตามเดิม
- ✅ `/customers` — รายชื่อลูกค้า, ค้นหา, ประวัติการเข้าพัก
- ✅ `/transactions` — รายรับ-รายจ่าย, ปิดยอดประจำวัน, Export, ปุ่ม "🛒 บันทึกขายของ" (เลือกสินค้าจาก is_for_sale=true, แสดงสต๊อก+ราคา, คำนวณยอดอัตโนมัติ, กันเกินสต๊อก, เรียก sellItem action เดิม — atomic transaction+movement, revalidate /inventory+/dashboard อัตโนมัติ); **ลบรายการขายของ**: `deleteTransaction` (`app/actions/transactions.js`) ก่อนลบ transaction จะ query `inventory_movements` ที่ `transaction_id` ตรงกัน → คืนสต๊อก (`current_stock` +=qty สำหรับ sale/stock_out, -=qty สำหรับ stock_in) → ลบ movements → ลบ transaction แล้วค่อย revalidate /inventory; UI (`TransactionsClient.js`) ตรวจ `category === 'ขายของ'` แสดง popup เตือนต่างหากก่อนลบเสมอ ครอบคลุม movement_type ทุกประเภทที่ผูกกับ transaction (ไม่ใช่เฉพาะ sale); **Role-based view (staff = เฉพาะของตัวเอง)**: ใน `app/(protected)/transactions/page.js` fetch `profiles.role` ก่อน แล้วใส่ `.eq('created_by', user.id)` เข้า transactions query เมื่อ role !== 'admin' — การ์ดสรุปวันนี้ (รายรับ/รายจ่าย/กำไรสุทธิ), ตารางรายการ, ExportButtons (Excel/PDF), และ date-range filter ทั้งหมด inherit การกรองนี้อัตโนมัติเพราะมาจาก array `transactions` ตัวเดียวกัน; แถวสรุปยอดช่วงวันที่ใต้ date filter (`รายรับรวม / รายจ่ายรวม / กำไรสุทธิ`) wrap ด้วย `{isAdmin && (...)}` ใน `TransactionsClient.js` — ซ่อนสำหรับ staff เพราะเป็นภาพรวมที่ไม่ต้องการให้เห็น; admin ยังเห็นข้อมูลครบเหมือนเดิมทุกอย่าง
- ✅ `/housekeeping` — สถานะห้อง, เปลี่ยนสถานะ, log
- ✅ `/rooms` — จัดการห้อง 19 ห้อง, toggle monthly
- ✅ `/rooms/[id]/meter` — มิเตอร์ไฟ/ค่าน้ำ รายเดือน, Export PDF
- ✅ `/inventory` — 5 แท็บ: **สต๊อก** (แสดงทุกรายการทั้ง is_for_sale=true/false/null รวมกัน, badge "ขายได้" ต่อท้ายชื่อถ้า is_for_sale=true, admin เพิ่ม/ตั้งค่า), **รับ/เบิก** (stock_in/stock_out ทุกรายการทั้ง sale และ non-sale — ของชิ้นเดียวกันใช้สต๊อกร่วมกันได้ทั้ง 2 ทาง), **ขายของ** (กรองแสดงเฉพาะ is_for_sale=true — "+ เพิ่มสินค้าขาย" เช็คชื่อซ้ำก่อน insert: ถ้าซ้ำแต่ยังไม่ใช่ sale item popup ถามยืนยัน, ถ้าซ้ำและเป็น sale item แล้วแจ้งเตือน; ปุ่ม "รับเข้า" per-row, ปุ่ม "ขาย" per-row — atomic transaction+movement), **คำขอ** (inventory_requests, admin อนุมัติ/ปฏิเสธ), **ประวัติ** (ทุกประเภท, badge สีเข้ม 3 สี); กันเกินสต๊อก client+server; rollback transaction ถ้า movement insert ล้มเหลว
- ✅ Sidebar responsive, hamburger menu บนมือถือ
- ✅ ทุกหน้า responsive (p-4 md:p-6, grid-cols-1 sm:grid-cols-X)
- ✅ `lib/dateUtils.js` — utility กลาง: formatDate (DD/MM/พ.ศ.), formatMonth, formatShortDate, formatLongDate, formatDateTime (timestamp + เวลา ไทม์โซน Asia/Bangkok), getTodayString (local timezone safe)
- ✅ `lib/currency.js` — `roundCurrency(value)` ปัดเศษเงินเป็น 2 ตำแหน่งแบบกัน floating-point error (`Math.round((n + Number.EPSILON) * 100) / 100`); ใช้ทุกจุดที่เขียน price/deposit ลง `bookings` และคำนวณ remaining/transaction amount (`createBooking`, `checkinBooking`, `adminUpdateBooking` ใน `app/actions/bookings.js`) กันราคา 300 → 299.99 จาก FP noise
- ✅ ฟอร์ม number input ของราคา/มัดจำ (BookingForm + edit modal ใน BookingsClient) เพิ่ม `onWheel={e => e.currentTarget.blur()}` กันลูกกลิ้งเมาส์เปลี่ยนค่าโดยไม่ตั้งใจ (step="0.01" + scroll = ลด 0.01 อัตโนมัติ)
- ✅ `supabase_audit_temp_price.sql` — query แบบอ่านอย่างเดียว นับ/list รายการ stay_type='temporary' ที่ price/deposit ลงท้ายด้วย .99/.98/.01/.02 (น่าจะตั้งใจเป็น .00) สำหรับตรวจสอบข้อมูลเก่าก่อนแก้ไขด้วยตัวเอง
- ✅ ฟิลด์ "จำนวน" ในทุกฟอร์มของ `/inventory` (ขายของ, รับเข้าสต๊อก sale-item, รับเข้าสต๊อกทั่วไป, เบิกของ) เปลี่ยนจาก `step="0.01" min="0.01"` เป็น `step="1" min="1" inputMode="numeric"` พร้อม `onWheel blur` กันบั๊กพิมพ์ "2" แล้วบันทึกเป็น 0.02 (iOS Safari/Chrome mobile กับ step="0.01" แปล digit เป็นช่องทศนิยมก่อน); ราคา/ทุนต่อหน่วยยังเป็น step="0.01" ตามเดิม
- ✅ `handleSell` ใน `InventoryClient.js` เพิ่ม confirm popup ถ้าจำนวนที่กรอก < 1 (เช่น 0.02) — แสดงจำนวน × ราคา × ยอดรวม ก่อนยืนยัน กันเคสบันทึกจำนวนผิดโดยไม่ตั้งใจ
- ✅ **onWheel blur ครอบคลุมทุก `<input type="number">`** — กันเคส scroll wheel เลื่อนค่าโดยไม่ตั้งใจ (เช่น ราคา 550 → 549.99) ครอบคลุมทุกฟอร์มเงิน/ราคา/จำนวน: `BookingForm` (price, deposit), `BookingsClient` edit modal (price, deposit), `TransactionForm` (amount), `TransactionsClient` sell modal (quantity — เปลี่ยน step=1 min=1 inputMode=numeric ด้วย), `MeterForm` (prev/curr_reading, unit_price, water_flat_fee), `MeterClient` (rentVal, edit prev/curr_reading, unit_price, water_flat_fee, deduction.amount), `RoomsTable` EditableCell (price_per_night, monthly_rent), `InventoryClient` ทุกช่อง (reorder_point, quantity ทั้ง 4, unit_cost ทั้ง 2, sale_price ทั้ง 2, requested_qty)
- ✅ **ฟอนต์ระบบเปลี่ยนเป็น Mali** (ฟอนต์ลายมือไทยจาก Google Fonts) — โหลดผ่าน `next/font/google` ใน `app/layout.js` (subsets: thai+latin, weight: 400/500/600/700, `variable: '--font-mali'`, `display: 'swap'`), ผูก `className={mali.variable}` ที่ `<html>`; `tailwind.config.js` ตั้ง `fontFamily.sans: ['var(--font-mali)', 'system-ui', '-apple-system', 'sans-serif']` ให้ Tailwind `font-sans` ทั้งระบบใช้ Mali อัตโนมัติ; ลบ Sarabun `@import` เดิมใน `app/globals.css` ออก (ย้ายมา self-hosted ตามแนวทาง Next.js 15 — ไม่มี render-blocking, ไม่ layout shift)