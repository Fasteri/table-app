import { getSql } from "@/app/lib/neon";

export const runtime = "nodejs";

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export async function PUT(req, { params }) {
  const personId = params?.id || null;
  const body = await req.json().catch(() => null);
  let name = normalizeName(body?.name);
  if (!personId && !body?.id) {
    return Response.json(
      { message: "INVALID_DATA", detail: "missing id" },
      { status: 400 }
    );
  }

  const sql = getSql();
  const finalId = personId || String(body?.id || "");
  if (!finalId) {
    return Response.json(
      { message: "INVALID_DATA", detail: "empty id" },
      { status: 400 }
    );
  }
  if (!name) {
    const current = await sql`select name from people where id = ${finalId}`;
    name = normalizeName(current?.[0]?.name);
  }
  if (!name) {
    return Response.json(
      { message: "INVALID_DATA", detail: "missing name" },
      { status: 400 }
    );
  }

  await sql`
    update people
    set
      name = ${name},
      gender = ${body?.gender === "Ж" ? "Ж" : "М"},
      group_number = ${Number(body?.groupNumber) || 1},
      study_status = ${body?.studyStatus === "Да" ? "Да" : "Нет"},
      impromptu_status = ${body?.impromptuStatus === "Да" ? "Да" : "Нет"},
      limitations_status = ${body?.limitationsStatus === "Да" ? "Да" : "Нет"},
      participation_status = ${body?.participationStatus === "Да" ? "Да" : "Нет"},
      notes = ${body?.notes || ""}
    where id = ${finalId}
  `;

  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const fromPath = pathParts[pathParts.length - 1];
  const personId = params?.id || url.searchParams.get("id") || fromPath;
  if (!personId) {
    return Response.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const sql = getSql();
  await sql`begin`;
  try {
    await sql`
      delete from tasks
      where conductor_id = ${personId} or assistant_id = ${personId}
    `;
    await sql`delete from people where id = ${personId}`;
    await sql`commit`;
  } catch (e) {
    await sql`rollback`;
    throw e;
  }

  return Response.json({ ok: true });
}
