-- ประวัติการแก้ไขใบเสร็จ (audit log — append-only)
-- ใช้เพื่อแสดง timeline ในหน้ารายละเอียดใบเสร็จ
-- receipt_no ต้นฉบับจะไม่ถูกเปลี่ยน แต่ทุกการแก้ไขจะสร้าง row ใหม่ในตารางนี้

create table if not exists receipt_edits (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  edited_by uuid references profiles(id) on delete set null,
  edited_at timestamptz not null default now(),
  changed_fields text[] not null default '{}',
  note text not null default '',
  changes jsonb
);

create index if not exists idx_receipt_edits_receipt_id
  on receipt_edits(receipt_id, edited_at desc);

alter table receipt_edits enable row level security;

-- ทุก authenticated เห็นได้ทั้งหมด (แสดง timeline)
create policy "receipt_edits_select" on receipt_edits for select
  to authenticated using (true);

-- ทุก authenticated สร้างได้ (server action เขียนตอน update ใบเสร็จ)
create policy "receipt_edits_insert" on receipt_edits for insert
  to authenticated with check (true);

-- ตรวจผล
select 'receipt_edits' as table_name, count(*) as rows from receipt_edits;
/c