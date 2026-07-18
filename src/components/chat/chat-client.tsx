"use client";

import { useEffect, useRef, useState } from "react";
import { parseChatEventStream, type ChatSource } from "@/lib/chat/stream";

async function responseError(response: Response) {
  const data = await response.json().catch(() => null) as { error?: string } | null;
  return data?.error ?? `Ошибка запроса (${response.status}).`;
}

export function ChatClient({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  async function ask() {
    if (!question.trim()) return;

    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setAnswer("");
    setSources([]);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(await responseError(response));
      if (!response.body) throw new Error("Браузер не предоставил поток ответа.");

      let completed = false;
      for await (const event of parseChatEventStream(response.body)) {
        if (event.type === "meta") setSources(event.sources);
        if (event.type === "delta") setAnswer((current) => current + event.text);
        if (event.type === "done") completed = true;
        if (event.type === "error") throw new Error(event.message);
      }
      if (!completed) throw new Error("Поток ответа прервался до завершения.");
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError(caught instanceof Error ? caught.message : "Не удалось получить ответ.");
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-36 w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-3" placeholder="Спросить по хранилищу..." />
        <button onClick={ask} disabled={loading} className="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60">{loading ? "Отвечаю..." : "Спросить"}</button>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
        {answer ? <div aria-live="polite" className="prose mt-5 whitespace-pre-wrap">{answer}</div> : null}
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
