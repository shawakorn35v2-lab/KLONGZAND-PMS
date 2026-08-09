-- ตารางเก็บการตั้งค่าต้นทุนและวันเริ่มนับกำไรสะสม
-- (1 แถวต่อระบบ แก้ไขได้ตลอด ไม่มีการลบ)
create table if not exists resort_settings (
  id int primary key default 1,
  investment_cost numeric(15,2) not null default 0,   -- ต้นทุนปรับปรุงรวม (บาท)
  investment_start_date date not null default current_date, -- วันที่เริ่มนับกำไรสะสม
  updated_at timestamptz default now()
);

-- บังคับให้มีแค่ 1 แถวเสมอ
alter table resort_settings add constraint resort_settings_single_row check (id = 1);

-- ใส่แถวเริ่มต้นไว้เลย (admin จะแก้ตัวเลขจริงในระบบภายหลัง)
insert into resort_settings (id, investment_cost, investment_start_date)
values (1, 0, current_date)
on conflict (id) do nothing;

-- ตรวจผล
select * from resort_settings;
