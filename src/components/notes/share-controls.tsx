"use client";

import { useState } from "react";
import { copyText } from "@/lib/browser/copy-text";

type ShareResponse = {
  sharePath?: string;
  error?: string;
};

export function ShareControls({
  noteId,
  initialSharePath,
  canManagePublicShare,
}: {
  noteId: string;
  initialSharePath: string | null;
  canManagePublicShare: boolean;
}) {
  const [sharePath, setSharePath] = useState(initialSharePath);
  const [pending, setPending] = useState<"enable" | "disable" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function enablePublicShare() {
    setPending("enable");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/notes/${noteId}/share`, { method: "POST" });
      const result = (await response.json()) as ShareResponse;
      if (!response.ok || !result.sharePath) {
        throw new Error(result.error ?? "Не удалось открыть публичный доступ.");
      }

      setSharePath(result.sharePath);
      const copied = await copyText(absoluteUrl(result.sharePath));
      setMessage(copied ? "Публичный доступ открыт, ссылка скопирована." : "Публичный доступ открыт.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось открыть публичный доступ.");
    } finally {
      setPending(null);
    }
  }

  async function disablePublicShare() {
    setPending("disable");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/notes/${noteId}/share`, { method: "DELETE" });
      const result = (await response.json()) as ShareResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Не удалось закрыть публичный доступ.");
      }

      setSharePath(null);
      setMessage("Публичный доступ закрыт. Старая ссылка больше не работает.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось закрыть публичный доступ.");
    } finally {
      setPending(null);
    }
  }

  async function copyCurrentLink() {
    setError("");
    const url = sharePath ? absoluteUrl(sharePath) : window.location.href;
    const copied = await copyText(url);
    if (copied) setMessage(sharePath ? "Публичная ссылка скопирована." : "Ссылка скопирована.");
    else setError("Не удалось скопировать ссылку. Скопируйте её из адресной строки.");
  }

  if (!canManagePublicShare) {
    return (
      <div className="grid justify-items-end gap-1">
        <button type="button" onClick={copyCurrentLink} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm">
          Скопировать ссылку
        </button>
        <StatusMessage message={message} error={error} />
      </div>
    );
  }

  return (
    <div className="grid justify-items-end gap-2">
      {sharePath ? (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copyCurrentLink} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white dark:text-[#111412]">
            Скопировать публичную ссылку
          </button>
          <button type="button" disabled={pending !== null} onClick={disablePublicShare} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-50">
            {pending === "disable" ? "Закрываем…" : "Закрыть доступ"}
          </button>
        </div>
      ) : (
        <button type="button" disabled={pending !== null} onClick={enablePublicShare} className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-50 dark:text-[#111412]">
          {pending === "enable" ? "Открываем…" : "Поделиться без авторизации"}
        </button>
      )}
      <p className="max-w-sm text-right text-xs text-[var(--muted)]">
        {sharePath ? "Доступ по публичной ссылке включён." : "Ссылка будет доступна любому, у кого она есть."}
      </p>
      <StatusMessage message={message} error={error} />
    </div>
  );
}

function StatusMessage({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null;
  return <p role="status" aria-live="polite" className={`max-w-sm text-right text-xs ${error ? "text-[var(--accent-2)]" : "text-[var(--accent)]"}`}>{error || message}</p>;
}

function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}
