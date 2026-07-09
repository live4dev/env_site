"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    if (!response.ok) {
      setError("Не удалось войти. Проверьте почту и пароль.");
      return;
    }
    router.push(search.get("next") ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <input name="email" type="email" required className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-3" placeholder="email" />
      <input name="password" type="password" required className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-3" placeholder="пароль" />
      {error ? <p className="text-sm text-[var(--accent-2)]">{error}</p> : null}
      <button className="rounded-md bg-[var(--accent)] px-4 py-3 font-medium text-white">Войти</button>
    </form>
  );
}
