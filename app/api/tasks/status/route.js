import { getSql } from "@/app/lib/neon";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const taskId = body?.taskId;
  const status = body?.status;
  if (!taskId || !status) {
    return Response.json({ message: "MISSING_FIELDS" }, { status: 400 });
  }

  const sql = getSql();
  const result = await sql`
    update tasks
    set status = ${status}
    where id = ${taskId}
  `;

  if (!result || result.count === 0) {
    return Response.json({ message: "TASK_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
