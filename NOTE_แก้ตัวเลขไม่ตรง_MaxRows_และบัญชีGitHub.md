# บันทึกงาน: แก้ตัวเลขรายรับ-รายจ่ายไม่ตรง + ตั้งค่าบัญชี GitHub

> วันที่: 2 กันยายน 2569 (2026-09-02)
> สถานะ: ✅ แก้เสร็จ deploy แล้ว — เหลืองานค้าง 2 ข้อ (ดูท้ายเอกสาร)
> เอกสารนี้เขียนไว้ให้เซตชั่นถัดไปอ่านต่อได้ทันที ไม่ต้องไล่ย้อน

---

## 1. ปัญหาที่เจอ

ตัวเลขบนหน้าเว็บไม่ตรงกัน:

| จุด | ตัวเลขที่แสดง |
|---|---|
| Dashboard รายรับสะสม | ฿535,895.05 |
| หน้ารายรับ-รายจ่าย (กดขยายตัวกรอง) | ฿394,877.08 |
| ส่วนต่าง | ~฿141,018 หายไป |

เดือน ก.ย. 2569 หายทั้งเดือน และเดือน ส.ค. ขาดไปครึ่งหนึ่ง

## 2. Root Cause — มี 3 ชั้นซ้อนกัน

### ชั้นที่ 1: PostgREST Max Rows ตัดแถวเงียบๆ

Supabase ตั้ง Max Rows ระดับโปรเจกต์ไว้ที่ **1000** (ค่า default)
ตอนนั้นมี transaction 1,168 แถว → ทุก query ที่ดึงทั้งตารางได้แค่ 1,000 แถวแรก
**ไม่มี error ไม่มี warning** แถวที่เหลือหายเงียบ

โค๊ดเดิมรวมยอดฝั่ง client (`filtered.reduce(...)`) จึงคำนวณจากข้อมูลที่ไม่ครบ

### ชั้นที่ 2: โค๊ดที่แก้แล้วยังไม่ได้ push

เซตชั่นก่อนหน้าแก้โค๊ดและ commit ไว้แล้ว (`f02f9a4`) แต่ push ไม่ผ่าน
`origin/main` ค้างอยู่ที่ `ab4549b` → Vercel ยังรันโค๊ดเก่า

### ชั้นที่ 3: views/RPC ในฐานข้อมูลไม่ตรงสเปก

โค๊ดใหม่เรียก `get_transaction_totals`, `v_dashboard_monthly` ฯลฯ
ของเดิมถูกสร้างไว้แล้วแต่ **ลำดับคอลัมน์ไม่ตรง** และ **ไม่มีไฟล์ .sql ใน repo เลย**

## 3. สิ่งที่แก้ไปแล้ว

### 3.1 ฝั่งฐานข้อมูล

สร้างไฟล์ **`supabase_schema_dashboard_views.sql`** (รันซ้ำได้ปลอดภัย)

สร้าง object 4 ตัว:

| Object | คอลัมน์ที่โค๊ดใช้ |
|---|---|
| `v_dashboard_monthly` | month_key, income, expense, net_profit, records |
| `v_dashboard_monthly_category` | month_key, tx_type, category, total |
| `v_category_usage` | category, records |
| `get_transaction_totals(date, date, uuid)` | records, income, expense, net |

**จุดที่ต้องระวัง:** ใช้ `DROP VIEW` + `CREATE VIEW` ไม่ใช่ `CREATE OR REPLACE`
เพราะ Postgres ห้ามเปลี่ยนชื่อ/ลำดับคอลัมน์ผ่าน REPLACE
(จะเจอ `ERROR 42P16: cannot change name of view column`)

ทุก view ใช้ `security_invoker = true` → RLS ยังทำงานปกติ

### 3.2 ฝั่งโค๊ด (commit f02f9a4)

- Dashboard, การ์ดรายเดือน, InvestmentTracker → อ่านยอดจาก view แทน scan ทั้งตาราง
- หน้ารายรับ-รายจ่าย → ใช้ RPC `get_transaction_totals` + `.range()` pagination จริง
- ยอดรวมไม่ผูกกับ checkbox filter อีกต่อไป มีข้อความกำกับ `(ทั้งช่วงวันที่ ... ไม่ขึ้นกับตัวกรอง)`
- query ที่เหลือใส่ `.order()` + `.limit()` ชัดเจน
- แสดง error บน UI แทนการโชว์ 0.00 เงียบๆ

### 3.3 Supabase Settings

ปรับ **Max Rows: 1000 → 10000** (เป็น safety net เฉยๆ ไม่ใช่ทางแก้หลัก)

## 4. ผลตรวจสอบ (ยืนยันแล้ว)

```sql
select * from v_dashboard_monthly order by month_key;
```

| month_key | income | expense | net_profit | records |
|---|---|---|---|---|
| 2026-05 | 69,243.68 | 72,486.81 | -3,243.13 | 67 |
| 2026-06 | 114,115.77 | 71,804.69 | 42,311.08 | 194 |
| 2026-07 | 138,256.80 | 106,350.76 | 31,906.04 | 362 |
| 2026-08 | 206,393.80 | 73,792.37 | 132,601.43 | 527 |
| 2026-09 | 7,885.00 | 0 | 7,885.00 | 24 |
| **รวม** | **535,895.05** | **324,434.63** | **211,460.42** | **1,174** |

✅ ตรงกับหน้าเว็บทุกตัว
✅ ก.ย. 2569 กลับมาครบ 24 รายการ
✅ ไม่มีแถวตกหล่น (view ไม่มี WHERE ถ้ามี tx_date เป็น NULL จะโผล่เป็นแถวที่ 6)

## 5. ปัญหาบัญชี GitHub (แก้แล้ว)

### แผนผังบัญชี

| อีเมล | GitHub | โปรเจกต์ | โฟลเดอร์ |
|---|---|---|---|
| shawakorn35v2@gmail.com | `shawakorn35v2-lab` | **KLONGZAND PMS** | D:\KLONGZAND\KLONGZAND PMS |
| shawakorn35@gmail.com | `shawakorn35-droid` | Xanadu Smart Pro, Employee Database, TEAM REQUEST HUB | D:\งานพี่เจ้น\... |

- repo: `shawakorn35v2-lab/KLONGZAND-PMS` (public, บัญชีบุคคล ไม่ใช่ organization)
- ทั้ง 2 เป็นบัญชี User คนละตัว ไม่ได้เป็น collaborator ของกันและกัน

### ทำไม push ไม่ได้ (403)

1. **Windows Credential Manager เก็บ key เดียว** — `git:https://github.com` ใครล็อกอินทีหลังทับตัวก่อน ทุก repo ใช้ร่วมกัน
2. **GCM เปิด default browser** ซึ่งคือ **Edge** ที่ค้าง session `shawakorn35-droid` อยู่
   (ส่วน Chrome ล็อกอิน `shawakorn35v2-lab` — คนละตัวกัน เลยสับสน)
3. auth ผ่านทุกครั้ง แต่ผ่านในฐานะบัญชีที่ไม่มีสิทธิ์เขียน → 403

### วิธีแก้ที่ใช้

```powershell
# 1. ให้ git จำ credential แยกตาม path ของ repo  ← หัวใจ
git config --global credential.https://github.com.useHttpPath true

# 2. sign out จาก github.com ทั้ง Chrome และ Edge (ใช้ "Sign out from all accounts")

# 3. ตั้งตัวตนประจำ repo
cd "D:\KLONGZAND\KLONGZAND PMS"
git config --local user.email shawakorn35v2@gmail.com
git config --local user.name "Shawakorn"

# 4. push แล้วล็อกอินให้ถูกบัญชี
git push origin main
```

จาก key เดียว `git:https://github.com`
กลายเป็น `git:https://github.com/<เจ้าของ>/<repo>` แยกกันทุก repo

### เวลาจะ push งาน XAND

**ไม่ต้องแก้อะไรเพิ่ม** แต่ครั้งแรกของแต่ละ repo จะเด้งเบราว์เซอร์
→ ต้องล็อกอินเป็น `shawakorn35-droid` (shawakorn35@gmail.com)
→ หลังจากนั้น git จำเองอัตโนมัติ ทั้ง 2 ฝั่งไม่กวนกันอีก

อย่าลืมตั้ง `user.email` ประจำ repo ฝั่ง XAND ด้วย:

```powershell
git config --local user.email shawakorn35@gmail.com
```

### เช็กว่าแยกกันจริง

```powershell
cmdkey /list | Select-String "github"
```

ต้องเห็นหลายบรรทัด แต่ละบรรทัดมี path ของ repo ต่อท้าย
ถ้าเห็นแค่ `git:https://github.com` โดดๆ = `useHttpPath` ไม่ทำงาน

### ทางเลือกถาวร (ยังไม่ได้ทำ)

ถ้ายังรู้สึกยุ่งยาก ใช้ **SSH key แยกบัญชี + host alias** ใน `~/.ssh/config`
(`github-klongzand` / `github-xand`) จะไม่ต้องพึ่งเบราว์เซอร์เลยแม้แต่ครั้งแรก
และ token ไม่หมดอายุ

---

## 6. งานที่ยังค้าง

### 6.1 ⚠️ ไฟล์ SQL ยังไม่ได้ commit

`supabase_schema_dashboard_views.sql` ยังเป็น untracked
ถ้าไม่ commit ครั้งหน้าจะไม่มี migration ให้ย้อนดู

```powershell
cd "D:\KLONGZAND\KLONGZAND PMS"
git add supabase_schema_dashboard_views.sql
git commit -m "chore(db): add dashboard views + get_transaction_totals migration"
git push origin main
```

### 6.2 query ที่ยังผูกกับ Max Rows

ยังมี query ที่ไม่ผ่าน view และอาจโดนตัดถ้าข้อมูลโตขึ้น:

- `app/(protected)/dashboard/page.js` → `bookings.select('room_id, status')` ไม่มี `.limit()`
- query ที่ใช้ `.limit(5000)` หลายจุด → ต้องให้ Max Rows ≥ 5000 เสมอ
- `app/(protected)/bookings/page.js` → ควรตรวจซ้ำ

**แนวทาง:** ทยอยย้ายไปใช้ view/RPC แบบเดียวกับ transactions

### 6.3 ตรวจหลัง deploy

เปิดหน้ารายรับ-รายจ่าย → กดขยาย "ตัวกรองเพิ่มเติม"
- ตัวเลขต้องค้างที่ 535,895.05 **ไม่ขยับตามการติ๊ก checkbox**
- ต้องมีข้อความ `(ทั้งช่วงวันที่ ... ไม่ขึ้นกับตัวกรองประเภท/หมวดหมู่ด้านบน)` กำกับ

ถ้าตัวเลขยังขยับตาม checkbox = Vercel ยัง deploy โค๊ดเก่าอยู่

---

## 7. บทเรียนที่ควรจำ

1. **PostgREST ตัดแถวโดยไม่แจ้ง** — query ที่ดึงทั้งตารางเพื่อรวมยอดเป็นระเบิดเวลาเสมอ
   ให้ DB รวมยอดผ่าน view/RPC แทน ผลลัพธ์เป็นหลักสิบแถว ไม่มีทางโดนตัด
2. **การเพิ่ม Max Rows เป็นการซื้อเวลา ไม่ใช่การแก้** — 10,000 จะชนอีกใน ~2 ปี (เพิ่มวันละ ~24 แถว)
3. **SQL ที่พิมพ์สดใน SQL Editor ต้องเก็บเป็นไฟล์ใน repo เสมอ** ไม่งั้นเซตชั่นถัดไปมองไม่เห็น
4. **`CREATE OR REPLACE VIEW` เปลี่ยนชื่อ/ลำดับคอลัมน์ไม่ได้** ต้อง DROP ก่อน
5. **ตรวจ `git status -sb` ก่อนสรุปว่าแก้เสร็จ** — commit แล้วไม่เท่ากับ deploy แล้ว
6. **หลาย GitHub account ในเครื่องเดียว** ต้องตั้ง `useHttpPath` ตั้งแต่แรก ไม่งั้นเจอ 403 วนไม่จบ

---

## 8. ข้อมูลอ้างอิง

| รายการ | ค่า |
|---|---|
| Supabase Project | `fkyvpmzntsonetrnmkev` |
| Production URL | https://klongzand-pms-resort.vercel.app |
| GitHub repo | https://github.com/shawakorn35v2-lab/KLONGZAND-PMS |
| Commit ที่แก้ | `f02f9a4` (push แล้ว 2026-09-02) |
| จำนวน transaction ณ วันที่บันทึก | 1,174 แถว |
| เริ่มนับข้อมูล | 1 พฤษภาคม 2569 |
| ต้นทุนลงทุน / คืนทุนแล้ว | ฿200,000 / ✅ 105.7% |
