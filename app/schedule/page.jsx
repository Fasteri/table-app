"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetDb } from "@/app/lib/dbClient";

function clsx(...a) {
  return a.filter(Boolean).join(" ");
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  if (raw.includes("T")) {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (raw.length >= 10) return raw.slice(0, 10);
  return "";
}

function formatRole(name) {
  if (!name) return "не назначено";
  return name;
}

export default function SchedulePage() {
  const router = useRouter();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetDb();
        if (!alive) return;
        setDb(data);
      } catch (e) {
        if (!alive) return;
        setError(String(e?.message || e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  const peopleById = useMemo(() => {
    const map = new Map();
    for (const p of db?.people || []) {
      map.set(String(p.id), p);
    }
    return map;
  }, [db]);

  const grouped = useMemo(() => {
    const tasks = db?.tasks || [];
    const from = fromDate || "";
    const to = toDate || "";

    const result = new Map();

    for (const t of tasks) {
      const key = normalizeDateKey(t.taskDate);
      if (!key) continue;

      if (from && !to && key !== from) continue;
      if (from && to && (key < from || key > to)) continue;
      if (!from && to && key !== to) continue;

      const arr = result.get(key) || [];
      arr.push(t);
      result.set(key, arr);
    }

    const sortedKeys = Array.from(result.keys()).sort();
    return sortedKeys.map((key) => {
      const list = result.get(key) || [];
      list.sort((a, b) => (a.taskNumber ?? 0) - (b.taskNumber ?? 0));
      return { date: key, tasks: list };
    });
  }, [db, fromDate, toDate]);

  const copyText = useMemo(() => {
    if (!db || grouped.length === 0) return "";
    const lines = [];
    grouped.forEach((group, index) => {
      lines.push(group.date);
      if (!group.tasks.length) {
        lines.push("  Задания не найдены.");
      } else {
        for (const t of group.tasks) {
          const assignments = Array.isArray(t.assignments) ? t.assignments : [];
          const conductor = assignments.find((a) => a.role === "Проводящий");
          const assistant = assignments.find((a) => a.role === "Помощник");
          const conductorName = conductor
            ? peopleById.get(String(conductor.personId))?.name
            : "";
          const assistantName = assistant
            ? peopleById.get(String(assistant.personId))?.name
            : "";
          lines.push(`  № ${t.taskNumber ?? "—"} — ${t.title || "—"}`);
          lines.push(`    Ситуация: ${t.situation ? t.situation : "—"}`);
          lines.push(`    Экспромт: ${t.isImpromptu || "—"}`);
          lines.push(`    Проводящий: ${formatRole(conductorName)}`);
          lines.push(`    Напарник: ${formatRole(assistantName)}`);
        }
      }
      if (index < grouped.length - 1) {
        lines.push("");
      }
    });
    return lines.join("\n");
  }, [db, grouped, peopleById]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Загрузка...
        </div>
      </main>
    );
  }

  if (!db) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Ошибка: {error || "db пустой"}
        </div>
      </main>
    );
  }

  const showEmpty =
    (!fromDate && !toDate) ||
    (fromDate && toDate && grouped.length === 0) ||
    (fromDate && !toDate && grouped.length === 0) ||
    (!fromDate && toDate && grouped.length === 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-md">
          {toast}
        </div>
      ) : null}
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              График заданий
            </h1>
            <div className="mt-1 text-sm text-slate-500">
              Выберите дату или период
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!copyText) {
                  showToast("Нет данных для копирования.");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(copyText);
                  showToast("Данные скопированы");
                } catch {
                  showToast("Не удалось скопировать.");
                }
              }}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Скопировать
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Назад
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:max-w-xl">
          <label className="block space-y-1.5">
            <div className="text-xs font-medium text-slate-500">С даты</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            />
          </label>
          <label className="block space-y-1.5">
            <div className="text-xs font-medium text-slate-500">По дату</div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            />
          </label>
        </div>
      </section>

      {showEmpty ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          {fromDate || toDate
            ? "Задания не найдены."
            : "Выберите дату или период для отображения заданий."}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <section
              key={group.date}
              className="rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="text-sm font-semibold text-slate-900">
                  {group.date}
                </div>
              </div>
              <div className="p-5 space-y-4">
                {group.tasks.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Задания не найдены.
                  </div>
                ) : (
                  group.tasks.map((t) => {
                    const assignments = Array.isArray(t.assignments)
                      ? t.assignments
                      : [];
                    const conductor = assignments.find(
                      (a) => a.role === "Проводящий"
                    );
                    const assistant = assignments.find(
                      (a) => a.role === "Помощник"
                    );
                    const conductorName = conductor
                      ? peopleById.get(String(conductor.personId))?.name
                      : "";
                    const assistantName = assistant
                      ? peopleById.get(String(assistant.personId))?.name
                      : "";

                    return (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                            № {t.taskNumber ?? "—"}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                            Экспромт: {t.isImpromptu || "—"}
                          </span>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {t.title || "—"}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          Ситуация: {t.situation ? t.situation : "—"}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                            Проводящий:{" "}
                            <span className="font-medium text-slate-900">
                              {formatRole(conductorName)}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                            Напарник:{" "}
                            <span className="font-medium text-slate-900">
                              {formatRole(assistantName)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
