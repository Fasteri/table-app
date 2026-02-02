import { getSql } from "@/app/lib/neon";

export const runtime = "nodejs";

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

export async function PUT(req, { params }) {
  const taskId = params?.id || null;
  const body = await req.json().catch(() => null);
  const finalId = taskId || String(body?.id || "");
  const assignments = Array.isArray(body?.assignments)
    ? body.assignments
    : body?.assignments
    ? [body.assignments]
    : [];
  const hasAssignments = assignments.length > 0;
  const conductor = assignments.find((a) => a.role === "Проводящий");
  const assistant = assignments.find((a) => a.role === "Помощник");
  const conductorId = hasAssignments ? conductor?.personId : body?.conductorId;
  const assistantId = hasAssignments
    ? assistant?.personId || null
    : body?.assistantId || null;
  const status =
    body?.status || conductor?.status || assistant?.status || "assigned";

  if (!finalId) {
    return Response.json(
      { message: "INVALID_DATA", detail: "missing id" },
      { status: 400 }
    );
  }
  const sql = getSql();
  const taskDate =
    normalizeDateOnly(body?.taskDate) ||
    (finalId
      ? (
          await sql`
            select to_char(task_date, 'YYYY-MM-DD') as task_date
            from tasks
            where id = ${finalId}
          `
        )
          .map((r) => r.task_date)
          .at(0) || null
      : null);

  if (!taskDate) {
    return Response.json(
      { message: "INVALID_DATA", detail: "missing taskDate" },
      { status: 400 }
    );
  }
  if (!conductorId && !assistantId) {
    return Response.json(
      { message: "INVALID_DATA", detail: "missing assignee" },
      { status: 400 }
    );
  }

  await sql`
    update tasks
    set
      task_date = ${taskDate},
      title = ${body.title || ""},
      situation = ${body.situation ?? null},
      is_impromptu = ${body.isImpromptu || "Нет"},
      task_number = ${Number(body.taskNumber) || 0},
      status = ${status},
      conductor_id = ${conductorId},
      assistant_id = ${assistantId}
    where id = ${finalId}
  `;

  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const fromPath = pathParts[pathParts.length - 1];
  const taskId = params?.id || url.searchParams.get("id") || fromPath;
  if (
    !taskId ||
    taskId === "tasks" ||
    taskId === "undefined" ||
    taskId === "null"
  ) {
    return Response.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const sql = getSql();
  await sql`delete from tasks where id = ${taskId}`;
  return Response.json({ ok: true });
}
