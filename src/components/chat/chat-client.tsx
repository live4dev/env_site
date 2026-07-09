"use client";

import { useState } from "react";

type Source = { title: string; url: string; heading?: string };

export function ChatClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    setAnswer(data.answer ?? "Ошибка ответа.");
    setSources(data.sources ?? []);
    setLoading(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-36 w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-3" placeholder="Спросить по хранилищу..." />
        <button onClick={ask} disabled={loading} className="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60">{loading ? "Ищу..." : "Спросить"}</button>
        {answer ? <div className="prose mt-5 whitespace-pre-wrap">{answer}</div> : null}
      </section>
      <aside className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="mb-3 font-semibold">Источники</h2>
        <div className="grid gap-2 text-sm">
          {sources.map((source) => <a key={source.url} href={source.url}>{source.title}{source.heading ? ` · ${source.heading}` : ""}</a>)}
        </div>
      </aside>
    </div>
  );
}
