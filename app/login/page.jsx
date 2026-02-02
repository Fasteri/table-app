"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Неверный пароль");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <form
        onSubmit={submit}
        className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-slate-900">Вход в таблицу</h1>
        <p className="mt-1 text-sm text-slate-500">Введите пароль для доступа.</p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            placeholder="Введите пароль"
          />
        </label>

        {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 h-10 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </main>
  );
}
