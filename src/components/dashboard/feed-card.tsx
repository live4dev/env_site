"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DashboardNote } from "@/lib/dashboard";

export function FeedCard({ item }: { item: DashboardNote }) {
  const router = useRouter();
  const [saved, setSaved] = useState(item.saved);
  const [readLater, setReadLater] = useState(item.readLater);
  const [pending, setPending] = useState<"saved" | "readLater" | null>(null);
  const [copied, setCopied] = useState(false);

  async function updateState(key: "saved" | "readLater", value: boolean) {
    const rollback = key === "saved" ? saved : readLater;
    if (key === "saved") setSaved(value);
    else setReadLater(value);
    setPending(key);
    try {
      const response = await fetch(`/api/notes/${item.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!response.ok) throw new Error("State update failed");
      router.refresh();
    } catch {
      if (key === "saved") setSaved(rollback);
      else setReadLater(rollback);
    } finally {
      setPending(null);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/notes/${item.slug}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const updated = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(item.updatedAt));
  const askHref = `/chat?q=${encodeURIComponent(`Расскажи главное из заметки «${item.title}» и предложи следующие действия.`)}`;

  return (
    <article className="group flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_48%,var(--line))] hover:shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">{item.reason}</span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{updated}</span>
      </div>
      <Link href={`/notes/${item.slug}`} className="hover:no-underline">
        <h3 className="text-base font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--accent)]">{item.title}</h3>
        {item.summary ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.summary}</p> : null}
      </Link>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted)]">
        {item.type ? <span className="rounded border border-[var(--line)] px-2 py-0.5">{item.type}</span> : null}
        {item.status ? <span className="rounded border border-[var(--line)] px-2 py-0.5">{item.status}</span> : null}
        <span className="max-w-full truncate rounded border border-[var(--line)] px-2 py-0.5">{item.vaultPath}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-[var(--line)] pt-3 text-xs">
        <ActionButton active={saved} disabled={pending === "saved"} onClick={() => updateState("saved", !saved)} label={saved ? "Сохранено" : "Сохранить"} icon={<BookmarkIcon filled={saved} />} />
        <ActionButton active={readLater} disabled={pending === "readLater"} onClick={() => updateState("readLater", !readLater)} label={readLater ? "В очереди" : "В очередь"} icon={<QueueIcon />} />
        <Link href={askHref} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--accent)] hover:no-underline"><SparkIcon /> Спросить</Link>
        <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"><CopyIcon /> {copied ? "Скопировано" : "Ссылка"}</button>
        {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--accent)] hover:no-underline">Источник <ExternalIcon /></a> : null}
      </div>
    </article>
  );
}

function ActionButton({ active, disabled, onClick, label, icon }: { active: boolean; disabled: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 disabled:opacity-50 ${active ? "bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"}`}>{icon}{label}</button>;
}

const Icon = ({ children, filled = false }: { children: React.ReactNode; filled?: boolean }) => <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">{children}</svg>;
const BookmarkIcon = ({ filled }: { filled: boolean }) => <Icon filled={filled}><path d="M6 4h12v17l-6-4-6 4Z" /></Icon>;
const QueueIcon = () => <Icon><path d="M4 6h10M4 12h10M4 18h7M18 15v6M15 18h6" /></Icon>;
const SparkIcon = () => <Icon><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4ZM18 15l.7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7Z" /></Icon>;
const CopyIcon = () => <Icon><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Icon>;
const ExternalIcon = () => <Icon><path d="M14 5h5v5M19 5l-8 8M18 13v6H5V6h6" /></Icon>;
