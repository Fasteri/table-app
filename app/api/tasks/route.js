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

export async function POST(req) {
  const body = await req.json().catch(() => null);
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

  const taskDate = normalizeDateOnly(body?.taskDate);
  if (!body?.id || !taskDate || (!conductorId && !assistantId)) {
    return Response.json({ message: "INVALID_DATA" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    insert into tasks (
      id, task_date, title, situation, is_impromptu, task_number,
      status, conductor_id, assistant_id
    ) values (
      ${body.id},
      ${taskDate},
      ${body.title || ""},
      ${body.situation ?? null},
      ${body.isImpromptu || "Нет"},
      ${Number(body.taskNumber) || 0},
      ${status},
      ${conductorId},
      ${assistantId}
    )
  `;

  return Response.json({ ok: true });
}
