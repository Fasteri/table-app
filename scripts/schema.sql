drop table if exists assignments;
drop table if exists tasks;
drop table if exists people;

create table if not exists people (
  id text primary key,
  name text not null,
  gender text not null,
  group_number integer not null,
  study_status text not null,
  impromptu_status text not null,
  limitations_status text not null,
  participation_status text not null,
  notes text not null
);

create table if not exists tasks (
  id text primary key,
  task_date date not null,
  title text not null,
  situation text null,
  is_impromptu text not null,
  task_number integer not null,
  status text not null,
  conductor_id text null references people(id) on delete restrict,
  assistant_id text null references people(id) on delete set null
);

create index if not exists idx_tasks_date on tasks(task_date);
create index if not exists idx_tasks_conductor on tasks(conductor_id);
create index if not exists idx_tasks_assistant on tasks(assistant_id);
