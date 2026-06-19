-- =====================================================================
-- KLONGZAND PMS - Supabase Database Schema
-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor (รันครั้งเดียวตอนตั้งโปรเจกต์)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES (ผู้ใช้งานระบบ: แอดมิน / พนักงาน)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่สมัคร (ผ่าน Supabase Auth)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------
-- 2. ROOMS (ห้องพัก 19 ห้อง)
-- ---------------------------------------------------------------------
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_no text not null unique,
  building text not null,              -- A, B, C
  room_type text default 'standard',
  price_per_night numeric(10,2) default 0,
  is_monthly boolean default false,    -- true = ห้องเช่ารายเดือน (คิดมิเตอร์ไฟ+น้ำเหมา)
  monthly_rent numeric(10,2) default 0,
  housekeeping_status text default 'clean' check (housekeeping_status in ('clean','dirty','maintenance')),
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into rooms (room_no, building) values
  ('A1','A'),('A2','A'),('A3','A'),('A4','A'),('A5','A'),('A6','A'),('A7','A'),
  ('B1','B'),('B2','B'),('B3','B'),('B4','B'),('B5','B'),('B6','B'),
  ('C1','C'),('C2','C'),('C3','C'),('C4','C'),('C5','C'),('C6','C')
on conflict (room_no) do nothing;

-- ---------------------------------------------------------------------
-- 3. CUSTOMERS (ลูกค้า + ประวัติ)
-- ---------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  note text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4. BOOKINGS (การจอง / เช็คอิน-เช็คเอาท์)
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  channel text not null default 'walkin' check (channel in ('walkin','agoda','line','facebook','sale')),
  checkin_date date not null,
  checkout_date date not null,
  price numeric(10,2) default 0,
  deposit numeric(10,2) default 0,
  status text not null default 'reserved' check (status in ('reserved','checked_in','checked_out','cancelled')),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. TRANSACTIONS (รายรับ-รายจ่าย รายวัน)
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tx_date date not null default current_date,
  tx_type text not null check (tx_type in ('income','expense')),
  category text not null,
  amount numeric(10,2) not null,
  note text,
  booking_id uuid references bookings(id) on delete set null,
  created_by uuid references profiles(id),
  is_closed boolean default false,     -- true หลังปิดยอดประจำวันแล้ว ห้ามแก้ไข
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 6. DAILY CLOSINGS (สรุปยอดปิดบัญชีประจำวัน ตัดยอด 23:59)
-- ---------------------------------------------------------------------
create table if not exists daily_closings (
  id uuid primary key default gen_random_uuid(),
  closing_date date not null unique,
  total_income numeric(10,2) default 0,
  total_expense numeric(10,2) default 0,
  net_amount numeric(10,2) default 0,
  closed_by uuid references profiles(id),
  closed_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 7. METER READINGS (มิเตอร์ไฟ + ค่าน้ำเหมา สำหรับห้องเช่ารายเดือน)
-- ---------------------------------------------------------------------
create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  billing_month date not null,          -- เก็บเป็นวันที่ 1 ของเดือน เช่น 2026-06-01
  prev_reading numeric(10,2) default 0,
  curr_reading numeric(10,2) default 0,
  unit_price numeric(10,2) default 7.5, -- บาท/หน่วย ปรับได้
  water_flat_fee numeric(10,2) default 0,
  electric_cost numeric(10,2) generated always as ((curr_reading - prev_reading) * unit_price) stored,
  total_amount numeric(10,2) generated always as (((curr_reading - prev_reading) * unit_price) + water_flat_fee) stored,
  created_at timestamptz default now(),
  unique (room_id, billing_month)
);

-- ---------------------------------------------------------------------
-- 8. HOUSEKEEPING LOG (ประวัติสถานะแม่บ้าน/ทำความสะอาด)
-- ---------------------------------------------------------------------
create table if not exists housekeeping_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  status text not null check (status in ('clean','dirty','maintenance')),
  note text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- MVP: ผู้ใช้ที่ login แล้ว (authenticated) อ่าน/เขียนได้ทุกตาราง
-- (แนะนำให้ทำ policy ละเอียดขึ้นตามสิทธิ์ admin/staff ในรอบถัดไป)
-- =====================================================================
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table customers enable row level security;
alter table bookings enable row level security;
alter table transactions enable row level security;
alter table daily_closings enable row level security;
alter table meter_readings enable row level security;
alter table housekeeping_log enable row level security;

create policy "authenticated read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "self update profile" on profiles for update using (auth.uid() = id);

create policy "authenticated full access rooms" on rooms for all using (auth.role() = 'authenticated');
create policy "authenticated full access customers" on customers for all using (auth.role() = 'authenticated');
create policy "authenticated full access bookings" on bookings for all using (auth.role() = 'authenticated');
create policy "authenticated full access transactions" on transactions for all using (auth.role() = 'authenticated');
create policy "authenticated full access daily_closings" on daily_closings for all using (auth.role() = 'authenticated');
create policy "authenticated full access meter_readings" on meter_readings for all using (auth.role() = 'authenticated');
create policy "authenticated full access housekeeping_log" on housekeeping_log for all using (auth.role() = 'authenticated');
