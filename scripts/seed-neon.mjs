import fs from "fs";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);
let raw = fs.readFileSync(
  new URL("../data/db.json", import.meta.url),
  "utf8"
);
if (raw.charCodeAt(0) === 0xfeff) {
  raw = raw.slice(1);
}
const db = JSON.parse(raw);

const people = Array.isArray(db.people) ? db.people : [];
const tasks = Array.isArray(db.tasks) ? db.tasks : [];

const normalizeAssignments = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

await sql`begin`;
try {
  await sql`delete from tasks`;
  await sql`delete from people`;

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
    `;
  }

  for (const t of tasks) {
    const assignments = normalizeAssignments(t.assignments);
    const conductor = assignments.find((a) => a.role === "Проводящий");
    const assistant = assignments.find((a) => a.role === "Помощник");

    await sql`
      insert into tasks (
        id, task_date, title, situation, is_impromptu, task_number,
        status, conductor_id, assistant_id
      ) values (
        ${t.id},
        ${t.taskDate},
        ${t.title || ""},
        ${t.situation ?? null},
        ${t.isImpromptu || "Нет"},
        ${Number(t.taskNumber) || 0},
        ${(conductor?.status || assistant?.status || "assigned")},
        ${conductor?.personId || assignments[0]?.personId},
        ${assistant?.personId || null}
      )
    `;
  }

  await sql`commit`;
} catch (error) {
  await sql`rollback`;
  throw error;
}

console.log("Seed completed");
