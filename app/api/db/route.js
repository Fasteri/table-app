import { getSql } from "@/app/lib/neon";

export const runtime = "nodejs";

function mapPersonRow(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    groupNumber: row.group_number,
    studyStatus: row.study_status,
    impromptuStatus: row.impromptu_status,
    limitationsStatus: row.limitations_status,
    participationStatus: row.participation_status,
    notes: row.notes,
  };
}

function mapTaskRow(row) {
  const assignments = [];
  if (row.conductor_id) {
    assignments.push({
      personId: row.conductor_id,
      role: "Проводящий",
      status: row.status || "assigned",
    });
  }
  if (row.assistant_id) {
    assignments.push({
      personId: row.assistant_id,
      role: "Помощник",
      status: row.status || "assigned",
    });
  }
  return {
    id: row.id,
    taskDate: row.task_date,
    title: row.title,
    situation: row.situation,
    isImpromptu: row.is_impromptu,
    taskNumber: row.task_number,
    status: row.status,
    conductorId: row.conductor_id,
    assistantId: row.assistant_id,
    assignments,
  };
}

function normalizeAssignments(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function deriveTaskFields(task) {
  const assignments = normalizeAssignments(task.assignments);
  const hasAssignments = assignments.length > 0;
  const conductor = assignments.find((a) => a.role === "Проводящий");
  const assistant = assignments.find((a) => a.role === "Помощник");
  return {
    conductorId: hasAssignments ? conductor?.personId : task.conductorId,
    assistantId: hasAssignments
      ? assistant?.personId || null
      : task.assistantId || null,
    status:
      task.status ||
      conductor?.status ||
      assistant?.status ||
      "assigned",
  };
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const sql = getSql();

  const [peopleRows, taskRows] = await Promise.all([
    sql`select * from people order by id`,
    sql`
      select
        id,
        to_char(task_date, 'YYYY-MM-DD') as task_date,
        title,
        situation,
        is_impromptu,
        task_number,
        status,
        conductor_id,
        assistant_id
      from tasks
      order by task_date, task_number, id
    `,
  ]);

  const people = peopleRows.map(mapPersonRow);
  const tasks = taskRows.map((t) => mapTaskRow(t));

  return Response.json({ people, tasks });
}

export async function PUT(req) {
  try {
    const body = await req.json().catch(() => null);
    const people = Array.isArray(body?.people) ? body.people : [];
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    const sql = getSql();

    await sql`begin`;
    try {
      const peopleIds = people.map((p) => p.id);
      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length) {
        await sql`delete from tasks where not (id = any(${taskIds}))`;
      } else {
        await sql`delete from tasks`;
      }

      if (peopleIds.length) {
        await sql`
          delete from tasks
          where not (conductor_id = any(${peopleIds}))
             or (assistant_id is not null and not (assistant_id = any(${peopleIds})))
        `;
      }

      if (peopleIds.length) {
        await sql`delete from people where not (id = any(${peopleIds}))`;
      } else {
        await sql`delete from people`;
      }

      for (const p of people) {
        await sql`
          insert into people (
            id, name, gender, group_number, study_status, impromptu_status,
            limitations_status, participation_status, notes
          ) values (
            ${p.id},
            ${p.name},
            ${p.gender},
            ${Number(p.groupNumber) || 1},
            ${p.studyStatus || "Нет"},
            ${p.impromptuStatus || "Нет"},
            ${p.limitationsStatus || "Нет"},
            ${p.participationStatus || "Да"},
            ${p.notes || ""}
          )
          on conflict (id) do update set
            name = excluded.name,
            gender = excluded.gender,
            group_number = excluded.group_number,
            study_status = excluded.study_status,
            impromptu_status = excluded.impromptu_status,
            limitations_status = excluded.limitations_status,
            participation_status = excluded.participation_status,
            notes = excluded.notes
        `;
      }

      for (const t of tasks) {
        const derived = deriveTaskFields(t);
        const taskDate = normalizeDateOnly(t.taskDate);
        await sql`
          insert into tasks (
            id, task_date, title, situation, is_impromptu, task_number,
            status, conductor_id, assistant_id
          ) values (
            ${t.id},
            ${taskDate},
            ${t.title || ""},
            ${t.situation ?? null},
            ${t.isImpromptu || "Нет"},
            ${Number(t.taskNumber) || 0},
            ${derived.status},
            ${derived.conductorId},
            ${derived.assistantId}
          )
          on conflict (id) do update set
            task_date = excluded.task_date,
            title = excluded.title,
            situation = excluded.situation,
            is_impromptu = excluded.is_impromptu,
            task_number = excluded.task_number,
            status = excluded.status,
            conductor_id = excluded.conductor_id,
            assistant_id = excluded.assistant_id
        `;
      }

      await sql`commit`;
    } catch (e) {
      await sql`rollback`;
      throw e;
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = String(err?.message || err);
    console.error("PUT /api/db failed:", message);
    return Response.json({ message }, { status: 500 });
  }
}
