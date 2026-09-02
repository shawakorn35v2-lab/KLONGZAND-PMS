-- =====================================================================
-- KLONGZAND PMS — Dashboard aggregate views + totals RPC
-- ใช้คู่กับ commit f02f9a4 "fix(dashboard): read totals from views/RPC"
--
-- เหตุผล: PostgREST มี Max Rows ระดับโปรเจกต์ (default 1000) ที่ตัดแถว
-- เงียบๆ ทุก query ที่ดึงทั้งตาราง ทำให้ยอดสะสมผิด การรวมยอดจึงย้าย
-- ไปคำนวณฝั่ง DB ทั้งหมด — ผลลัพธ์เป็นหลักสิบแถว ไม่มีทางโดนตัด
--
-- รันไฟล์นี้ใน Supabase SQL Editor ก่อน deploy โค๊ดชุดใหม่
-- ปลอดภัยที่จะรันซ้ำ (idempotent) — ใช้ DROP + CREATE เพราะ
-- CREATE OR REPLACE VIEW เปลี่ยนชื่อ/ลำดับคอลัมน์ของ view เดิมไม่ได้
-- (ERROR 42P16: cannot change name of view column)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) (ทางเลือก) ดูนิยาม view เดิมก่อน เผื่ออยากเก็บไว้เทียบ
--    เอา comment ออกแล้วรันแยกก่อนได้
-- ---------------------------------------------------------------------
-- select table_name, view_definition
--   from information_schema.views
--  where table_schema = 'public'
--    and table_name in ('v_dashboard_monthly','v_dashboard_monthly_category','v_category_usage');

-- ---------------------------------------------------------------------
-- 1) ลบของเดิมทิ้งก่อน (view + ทุก overload ของ function)
-- ---------------------------------------------------------------------
drop view if exists v_dashboard_monthly           cascade;
drop view if exists v_dashboard_monthly_category  cascade;
drop view if exists v_category_usage              cascade;

do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
      from pg_proc
     where proname = 'get_transaction_totals'
       and pronamespace = 'public'::regnamespace
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) ยอดรวมรายเดือน — month_key เป็น text 'YYYY-MM' ให้ตรงกับฝั่ง JS
--    คอลัมน์ที่โค๊ดใช้: month_key, income, expense, net_profit, records
-- ---------------------------------------------------------------------
create view v_dashboard_monthly
with (security_invoker = true) as
select
  to_char(tx_date, 'YYYY-MM')                                     as month_key,
  coalesce(sum(amount) filter (where tx_type = 'income'),  0)     as income,
  coalesce(sum(amount) filter (where tx_type = 'expense'), 0)     as expense,
  coalesce(sum(amount) filter (where tx_type = 'income'),  0)
    - coalesce(sum(amount) filter (where tx_type = 'expense'), 0) as net_profit,
  count(*)                                                        as records
from transactions
group by 1;

-- ---------------------------------------------------------------------
-- 3) ยอดรวมรายเดือน แยกตามหมวดหมู่ (ใช้ทำ Top 3 ในการ์ดรายเดือน)
--    คอลัมน์ที่โค๊ดใช้: month_key, tx_type, category, total
-- ---------------------------------------------------------------------
create view v_dashboard_monthly_category
with (security_invoker = true) as
select
  to_char(tx_date, 'YYYY-MM') as month_key,
  tx_type,
  category,
  coalesce(sum(amount), 0)    as total,
  count(*)                    as records
from transactions
group by 1, 2, 3;

-- ---------------------------------------------------------------------
-- 4) จำนวนรายการต่อหมวดหมู่ (เตือนก่อนลบหมวดหมู่ที่ยังถูกใช้อยู่)
--    คอลัมน์ที่โค๊ดใช้: category, records
-- ---------------------------------------------------------------------
create view v_category_usage
with (security_invoker = true) as
select
  category,
  count(*) as records
from transactions
where category is not null
group by 1;

-- ---------------------------------------------------------------------
-- 5) ยอดรวมตามช่วงวันที่ — ใช้ในหน้ารายรับ-รายจ่าย
--    p_created_by = null  → ทั้งระบบ (admin)
--    p_created_by = uuid  → เฉพาะรายการที่ผู้ใช้คนนั้นบันทึก (staff)
-- ---------------------------------------------------------------------
create function get_transaction_totals(
  p_from       date,
  p_to         date,
  p_created_by uuid default null
)
returns table (
  records bigint,
  income  numeric,
  expense numeric,
  net     numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)                                                        as records,
    coalesce(sum(amount) filter (where tx_type = 'income'),  0)     as income,
    coalesce(sum(amount) filter (where tx_type = 'expense'), 0)     as expense,
    coalesce(sum(amount) filter (where tx_type = 'income'),  0)
      - coalesce(sum(amount) filter (where tx_type = 'expense'), 0) as net
  from transactions
  where tx_date >= p_from
    and tx_date <= p_to
    and (p_created_by is null or created_by = p_created_by);
$$;

-- ---------------------------------------------------------------------
-- 6) สิทธิ์
-- ---------------------------------------------------------------------
grant select on v_dashboard_monthly           to authenticated;
grant select on v_dashboard_monthly_category  to authenticated;
grant select on v_category_usage              to authenticated;
grant execute on function get_transaction_totals(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7) Index ช่วยให้ group by / range scan เร็วขึ้นเมื่อข้อมูลโตขึ้น
-- ---------------------------------------------------------------------
create index if not exists idx_transactions_tx_date      on transactions (tx_date);
create index if not exists idx_transactions_tx_date_type on transactions (tx_date, tx_type);

-- ---------------------------------------------------------------------
-- 8) ตรวจผลหลังรัน — รันแยกอีกครั้ง ตัวเลขต้องตรงกับที่หน้าเว็บแสดง
-- ---------------------------------------------------------------------
-- select * from get_transaction_totals('2026-05-01','2026-09-02', null);
--   -> คาดหวัง income 535895.05 / expense 324434.63 / net 211460.42
--
-- select sum(income) as all_income, sum(expense) as all_expense,
--        sum(net_profit) as all_net, sum(records) as all_records
--   from v_dashboard_monthly;
--   -> all_records ต้องเท่ากับ select count(*) from transactions;
