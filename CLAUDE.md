# CLAUDE.md

คำแนะนำสำหรับ Claude Code / AI agent ที่เข้ามาทำงานในโปรเจกต์นี้ อ่านไฟล์นี้ก่อนแก้โค้ดทุกครั้ง

## ภาพรวมโปรเจกต์

**KLONGZAND PMS** — ระบบจัดการรีสอร์ท (Property Management System) สำหรับรีสอร์ท 19 ห้อง (อาคาร A1-A7, B1-B6, C1-C6)
ครอบคลุม: จองห้อง/เช็คอิน-เช็คเอาท์, ลูกค้า, รายรับ-รายจ่าย, ใบเสร็จ, มิเตอร์ไฟ/น้ำห้องรายเดือน, แม่บ้าน, สต๊อกของใช้, แดชบอร์ด
UI ภาษาไทยทั้งหมด หน่วยเงินบาท

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Next.js 15 (App Router), **JavaScript ล้วน ไม่ใช้ TypeScript** (`jsconfig.json` ให้ alias `@/*`) |
| UI | React 19, Tailwind CSS 3, ฟอนต์ Mali (self-hosted ผ่าน `next/font/google`) |
| Database + Auth | Supabase (Postgres + Supabase Auth) ผ่าน `@supabase/supabase-js` + `@supabase/ssr` |
| กราฟ | recharts |
| Export | `xlsx` (Excel), `jspdf` + `jspdf-autotable` + `html2canvas` (PDF) |
| Hosting | Vercel (auto-deploy จาก GitHub `main`) |

ไม่มี testing framework / CI ติดตั้งไว้ (ไม่มี `.github/workflows`, ไม่มี test script ใน `package.json`) — ตรวจสอบด้วย `npm run build` + `npm run lint` และทดสอบมือก่อน push

## Pipeline: GitHub → Vercel → Supabase

- **GitHub repo**: https://github.com/shawakorn35v2-lab/KLONGZAND-PMS (public, บัญชีบุคคล `shawakorn35v2-lab`, ไม่ใช่ organization)
- **Vercel project**: `klongzand-pms` (projectId `prj_pOQKJmlEWS7eD2HVepKmzE9poBYG`) — auto-deploy ทุกครั้งที่ push ขึ้น `main`. Production URL: https://klongzand-pms-resort.vercel.app
- **Supabase project ref**: `fkyvpmzntsonetrnmkev` — DB schema จัดการผ่านไฟล์ `.sql` ที่ root ของ repo (ดูหัวข้อด้านล่าง) รันเองใน Supabase SQL Editor **ไม่มี auto-migration**
- **⚠️ เครื่องนี้มี 2 บัญชี GitHub**: repo นี้ต้อง push ด้วย `shawakorn35v2@gmail.com` (`shawakorn35v2-lab`) เท่านั้น — มีอีกโปรเจกต์ (Xanadu ฯลฯ) ใช้บัญชี `shawakorn35-droid` คนละตัว เคยชนกันจน push ได้ 403 มาแล้ว วิธีแก้ที่ตั้งไว้แล้ว: `git config --global credential.https://github.com.useHttpPath true` + ตั้ง `git config --local user.email/user.name` แยกต่อ repo (รายละเอียดเต็มใน `NOTE_แก้ตัวเลขไม่ตรง_MaxRows_และบัญชีGitHub.md` หัวข้อ 5)

## Environment variables

`.env.local` (ห้าม commit, อยู่ใน `.gitignore` แล้ว) ต้องมี:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
ตั้งค่าเดียวกันนี้ไว้ใน Vercel Project Settings ด้วย — ห้าม hardcode ค่าใดๆ ในโค้ด (กฎเดิมของโปรเจกต์)

## คำสั่งที่ใช้บ่อย

```
npm run dev      # dev server
npm run build    # ต้องผ่านไม่มี error ก่อน push เสมอ
npm run lint
```

## Auth & สิทธิ์ผู้ใช้

- Supabase Auth (email/password), ป้องกันทุก route ผ่าน `middleware.js` ยกเว้น `/login`
- role เก็บใน `profiles.role` (`'admin' | 'staff'`)
- `ADMIN_ONLY_PATHS` ใน `middleware.js` = `['/dashboard', '/booking-history']`; `ADMIN_ONLY_PATTERNS` ปัจจุบันว่างเปล่า (เดิมกันหน้ามิเตอร์ไว้ ภายหลังเปิดให้ staff ใช้ได้)
- staff: จอง/เช็คอิน/เช็คเอาท์/โยกห้องได้ แต่ลบการจองไม่ได้, ดูรายงานการเงินรวม/แดชบอร์ดไม่ได้
- admin: เข้าถึงทุกอย่าง

## แผนผังโค้ด

```
app/(protected)/*/page.js         Server Component ต่อหน้า (fetch ข้อมูล)
app/(protected)/*/*Client.js      Client Component (interactivity)
app/actions/*.js                  Server Actions — ตรรกะธุรกิจหลักเกือบทั้งหมดอยู่ที่นี่
components/                       UI + ฟอร์ม + preview สำหรับพิมพ์/PDF
lib/supabase-server.js            Supabase client ฝั่ง server (cookies)
lib/supabase-browser.js           Supabase client ฝั่ง browser
lib/currency.js                   roundCurrency() — ปัดเศษเงินกัน floating-point
lib/dateUtils.js                  format วันที่ไทย/พ.ศ. + getTodayBangkok() (ล็อค timezone)
lib/bookingEditFormat.js          formatter กลางสำหรับ audit log การแก้ไขการจอง
middleware.js                     auth + role-based route guard
*.sql (root)                      schema/migration — วาง "สคริปต์ที่ต้องรันเองใน Supabase SQL Editor" ไม่ใช่ migration อัตโนมัติ
KLONGZAND_PMS_PROMPT.md           สเปกเริ่มต้น + changelog ฟีเจอร์แบบละเอียดทุกวันที่ (อ่านก่อนถ้าอยากรู้ "ทำไมโค้ดจุดนี้ถึงเป็นแบบนี้")
NOTE_*.md                         บันทึกส่งต่องาน (incident เฉพาะเรื่อง) — ดูหัวข้อท้ายไฟล์นี้
```

## Data model (ดู `supabase_schema*.sql` เป็น source of truth ตัวจริง)

ตารางหลัก: `profiles`, `rooms` (19 ห้อง), `customers`, `bookings`, `transactions`, `meter_readings`, `housekeeping_log`, `inventory_items` / `inventory_movements` / `inventory_requests`, `receipts` / `receipt_items`, `booking_edits` (audit log), `transaction_categories`, `resort_settings`

View/RPC สำหรับสรุปยอด (อยู่ใน `supabase_schema_dashboard_views.sql`) — **ต้องใช้จุดนี้แทนการดึงทั้งตารางมารวมยอดฝั่ง client เสมอ**:
- `v_dashboard_monthly` (month_key, income, expense, net_profit, records)
- `v_dashboard_monthly_category` (month_key, tx_type, category, total)
- `v_category_usage` (category, records)
- `get_transaction_totals(p_from, p_to, p_created_by)` RPC — `p_created_by = null` คือทั้งระบบ (admin), ส่ง uuid คือเฉพาะของ staff คนนั้น

ตารางที่ **ยังอยู่ในสคีมาแต่ไม่มีโค้ดเรียกใช้แล้ว**: `daily_closings`, คอลัมน์ `transactions.is_closed` — ฟีเจอร์ "ปิดยอดประจำวัน" ถูกถอดออกทั้งระบบเมื่อ 2026-07-02 ตามที่เจ้าของระบบสั่งให้เก็บตาราง/คอลัมน์ไว้ **ห้ามลบและห้ามชุบชีวิต logic ที่อิงกับมันกลับมาโดยไม่ถามก่อน**

## กฎ/จุดพลาดง่ายที่ต้องรู้ก่อนแตะ logic เงิน-การจอง

1. **ห้ามรวมยอดฝั่ง client จาก `.select('*')` ทั้งตาราง** — Supabase/PostgREST มี "Max Rows" ระดับโปรเจกต์ (เคยตั้งไว้ที่ 1000 ค่า default, ปรับเป็น 10000 แล้วแต่ยังมีจำกัด) ตัดแถวเกินโควตาแบบ**เงียบๆ ไม่มี error** เคยทำให้ยอดรายรับ dashboard ผิดไปกว่า 1.4 แสนบาทมาแล้ว (ดู `NOTE_แก้ตัวเลขไม่ตรง_MaxRows_และบัญชีGitHub.md`) ฟีเจอร์ "รวมยอด" ใหม่ทุกตัวต้องขยาย view/RPC ด้านบน ไม่ใช่ query ทั้งตารางแล้ว reduce เอง
2. **เงิน**: ทุกจุดที่เขียน price/deposit/amount ต้องผ่าน `roundCurrency()` จาก `lib/currency.js` กัน floating-point noise (เช่น 300 → 299.99)
3. **เวลา**: "วันนี้" สำหรับ `tx_date` ต้องใช้ `getTodayBangkok()` (ล็อค Asia/Bangkok ผ่าน `Intl.DateTimeFormat`) ไม่ใช่ `new Date()` เฉยๆ — server อาจรันคนละ timezone กับไทย
4. **มัดจำ vs ค่าห้องส่วนที่เหลือ** (แก้ 2026-08-23): มัดจำบันทึกเป็นรายรับ **ตอนจอง** (`tx_date` = วันนี้ Bangkok TZ), ค่าห้องส่วนที่เหลือบันทึก **ตอนเช็คอิน** (`tx_date` = `checkin_date` จริง) — อย่ารวมสองอันนี้กลับเป็นรายการเดียว
5. **ยกเลิก vs ลบถาวร**: `cancelBooking` ลบเฉพาะ transaction หมวด `ค่าห้อง` เก็บ `ค่ามัดจำ` ไว้เสมอ (นโยบายยึดมัดจำเมื่อลูกค้ายกเลิก/no-show) ส่วน `adminDeleteBooking` ลบ transaction ทุกหมวดที่ผูกกับ booking นั้น — ห้ามรวม logic สองอันนี้เข้าด้วยกัน
6. **เช็คห้องว่าง**: ทุกจุดต้องกรอง booking ที่ status = `cancelled` **และ** `checked_out` ออกจาก conflict check (แก้ 2026-08-09) ยกเว้น grid แสดงผลใน `BookingsClient.js` (`occupiedMap`) ที่ตั้งใจแยก logic วันอดีต (โชว์ checked_out เป็นสีปกติ) กับวันนี้/อนาคต (กรองออกให้ขายต่อได้) — อ่าน comment ในไฟล์นั้นก่อนแก้
7. **`transactions.category` เป็น text ธรรมดา ไม่ใช่ FK** ไปยัง `transaction_categories` — filter ต้องรองรับค่าที่ไม่ตรงกับชื่อในตารางหมวดหมู่ (treat เป็น "แสดงเสมอ" ไม่ใช่ "ซ่อนเสมอ")
8. **กันเช็คอินซ้ำสร้างรายรับซ้ำ**: `checkinBooking` เช็ค transaction หมวด `ค่าห้อง` ที่ผูกกับ booking นั้นอยู่แล้วก่อน insert เสมอ + client มี `window.confirm` ก่อนกดเช็คอิน — ต้องคงทั้งสองชั้นไว้ถ้าแก้โค้ดจุดนี้
9. **View ใน Supabase**: `CREATE OR REPLACE VIEW` เปลี่ยนชื่อ/ลำดับคอลัมน์ไม่ได้ (`ERROR 42P16`) ต้อง `DROP VIEW` ก่อนเสมอเวลาแก้โครงสร้าง view — และ **ทุก SQL ที่รันสดใน Supabase SQL Editor ต้องเซฟเป็นไฟล์ `.sql` commit เข้า repo ด้วยเสมอ** (เคยรันสดแล้วลืมเก็บไฟล์ ทำให้ production กับโค้ดใน repo ไม่ตรงกันชั่วคราว)
10. **PDF ภาษาไทย**: ใช้วิธี `html2canvas` แคปหน้า DOM แล้ว embed เป็นรูปใน `jsPDF` (ดู `MeterClient.js`, `ReceiptPreview.js`, `BookingPrintPreview.js`) **ห้ามใช้ `jsPDF.text()` ตรงๆ กับฟอนต์ default** (เช่น helvetica) เพราะไม่รองรับ Unicode ไทย จะได้ตัวอักษรเพี้ยนเป็น `&&&`

## งานค้างที่รู้อยู่แล้ว (ณ วันที่ 2026-09-03)

- **Working tree ปัจจุบันมีการแก้ไขที่ยังไม่ commit** ใน `app/(protected)/dashboard/page.js`, `transactions/page.js`, `customers/page.js`, `InvestmentTracker.js`, `MonthlyFinanceCard.js`, `charts/MonthlySalesChart.js` และมีไฟล์ `prompt_*.txt` เก่าหลายไฟล์ถูกลบ (ยังไม่ commit) — ตรวจ `git status` ก่อน commit/push ทุกครั้ง
- ยังมี query บางจุดที่ไม่ผ่าน view/RPC และอาจโดน Max Rows ตัดถ้าข้อมูลโตขึ้นอีก (เช่น `bookings.select('room_id, status')` ที่ไม่มี `.limit()` ใน dashboard, query ที่ใช้ `.limit(5000)` ตรงๆ) — ดูรายละเอียดใน `NOTE_แก้ตัวเลขไม่ตรง_MaxRows_และบัญชีGitHub.md` หัวข้อ 6.2
- **แก้ข้อมูลมัดจำย้อนหลังที่หายไปจากยุคก่อน 2026-08-23** — ร่าง SQL ไว้แล้วแต่ **ยังไม่ได้รัน** ต้องถามเจ้าของระบบก่อนรัน (`NOTE_แก้ข้อมูลมัดจำย้อนหลัง.md`)

## หาข้อมูลเพิ่มเติมได้ที่ไหน

- **`KLONGZAND_PMS_PROMPT.md`** — สเปกตั้งต้น + changelog ฟีเจอร์แบบละเอียดทุกวันที่ (ไฟล์ใหญ่ ภาษาไทย) เป็นแหล่งข้อมูล "ทำไมโค้ดตรงนี้ถึงเขียนแบบนี้" ที่ครบที่สุดในโปรเจกต์ — อ่านก่อนแก้ฟีเจอร์ใหญ่
- **`NOTE_แก้ตัวเลขไม่ตรง_MaxRows_และบัญชีGitHub.md`** — เหตุการณ์ยอดเงินไม่ตรง + Max Rows + ปัญหาบัญชี GitHub 2 ตัวบนเครื่องเดียว
- **`NOTE_แก้ข้อมูลมัดจำย้อนหลัง.md`** — แผนแก้ข้อมูลมัดจำเก่าที่ยังไม่ได้ลงมือทำ
