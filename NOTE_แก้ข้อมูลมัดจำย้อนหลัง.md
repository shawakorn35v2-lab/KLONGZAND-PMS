# งานค้าง: แก้ข้อมูลเงินมัดจำย้อนหลัง

_บันทึกไว้ 23 ส.ค. 2569 — ยังไม่ได้ลงมือแก้_

## สิ่งที่พบจากข้อมูลจริง

ระบบเดิม **ไม่เคยบันทึกเงินมัดจำเป็นรายรับเลย** — ไม่ใช่ "เข้าผิดวัน" อย่างที่เข้าใจตอนแรก

รูปแบบที่เจอ: ตอนเช็คอิน ระบบบันทึกแค่ `ค่าห้อง − มัดจำ` (ส่วนที่เหลือ) เข้าวันเช็คอิน
ส่วนเงินมัดจำที่รับมาตอนจอง **หายไปจากระบบรายรับ**

ตัวอย่าง:
| ห้อง | ลูกค้า | ค่าห้อง | มัดจำ | ยอดที่ลงระบบ | ขาดไป |
|---|---|---|---|---|---|
| C1 | กรวิทย์ | 800 | 450 | 350 | 450 |
| B4 | ทศพล | 500 | 200 | 300 | 200 |
| C1 | ปวีณา | 1,100 | 550 | 550 | 550 |

## ยอดที่หายไป (ประมาณการ)

- การจองที่เช็คอินแล้ว/เช็คเอาท์แล้ว: **~3,875 บาท**
- การจองที่ยังไม่เช็คอิน (reserved) แต่รับมัดจำแล้ว: **~1,700 บาท**
- **รวมประมาณ 5,575 บาท**

> ไม่นับ 2 รายการของ "นาย A" (status = cancelled, ดูเหมือนข้อมูลทดสอบ)

## ⚠️ ข้อควรระวังก่อนแก้

ในระบบมี transaction หมวด `ค่ามัดจำ` อยู่แล้ว **7 รายการ**
→ บาง booking อาจบันทึกมัดจำไปแล้ว ห้าม insert ซ้ำ

## SQL สำหรับแก้ (ยังไม่รัน — ตรวจก่อน)

### ขั้นที่ 1 — ดูว่าจะเพิ่มรายการอะไรบ้าง (preview เท่านั้น)

```sql
SELECT b.created_at::date AS จะลงวันที่,
       r.room_no,
       c.full_name,
       b.deposit AS ยอดมัดจำ,
       b.status
FROM bookings b
LEFT JOIN rooms r     ON b.room_id = r.id
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.deposit > 0
  AND b.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.booking_id = b.id AND t.category = 'ค่ามัดจำ'
  )
ORDER BY b.created_at;
```

**ตรวจผลให้ครบก่อน** ว่าทุกรายการคือเงินที่รับมาจริง

### ขั้นที่ 2 — เพิ่มรายรับมัดจำย้อนหลัง

```sql
INSERT INTO transactions (tx_date, tx_type, category, amount, booking_id, note)
SELECT b.created_at::date,
       'income',
       'ค่ามัดจำ',
       b.deposit,
       b.id,
       'รับมัดจำ ห้อง ' || COALESCE(r.room_no,'-') ||
         ' (' || COALESCE(c.full_name,'-') || ') — ลงย้อนหลัง'
FROM bookings b
LEFT JOIN rooms r     ON b.room_id = r.id
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.deposit > 0
  AND b.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.booking_id = b.id AND t.category = 'ค่ามัดจำ'
  );
```

### ขั้นที่ 3 — ตรวจยอดหลังแก้

```sql
SELECT tx_date, category, SUM(amount) AS ยอด
FROM transactions
WHERE category = 'ค่ามัดจำ'
GROUP BY tx_date, category
ORDER BY tx_date;
```

## หมายเหตุ

- ใช้ `created_at` (วันที่สร้างการจอง) เป็นวันที่รับมัดจำ — เป็นค่าประมาณที่ใกล้เคียงที่สุด
- ถ้าจำได้ว่ารายการไหนรับเงินคนละวันกับวันจอง แก้ `tx_date` รายตัวทีหลังได้
- โค้ดใหม่ (commit `2864920`) จัดการเรื่องนี้ถูกต้องแล้ว — ปัญหานี้เฉพาะข้อมูลเก่า
