"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  title: string;
  url: string;
  vaultPath: string;
  type: string | null;
  status: string | null;
  snippet: string;
};

type CommandItem = { id: string; title: string; description: string; href: string; kind: "command" | "note" };

const commands: CommandItem[] = [
  { id: "home", title: "Сегодня в хранилище", description: "Открыть главную ленту", href: "/", kind: "command" },
  { id: "inputs", title: "Входящие", description: "Источники и новые материалы", href: "/inputs", kind: "command" },
  { id: "outputs", title: "Результаты", description: "Готовые и опубликованные материалы", href: "/outputs", kind: "command" },
  { id: "saved", title: "Сохранённое", description: "Персональная коллекция заметок", href: "/?period=saved", kind: "command" },
  { id: "queue", title: "Очередь чтения", description: "Материалы на потом", href: "/?period=queue", kind: "command" },
  { id: "chat", title: "Задать вопрос", description: "Открыть AI Q&A по хранилищу", href: "/chat", kind: "command" },
  { id: "graph", title: "Граф связей", description: "Исследовать связи между заметками", href: "/graph", kind: "command" },
];

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("vault:command", show);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("vault:command", show);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&mode=keyword&limit=8`, { signal: controller.signal });
        const data = await response.json();
        setResults(response.ok ? data.results ?? [] : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  const items = useMemo<CommandItem[]>(() => {
    if (!query.trim()) return commands;
    const noteItems = results.map((result) => ({ id: result.id, title: result.title, description: `${result.vaultPath}${result.status ? ` · ${result.status}` : ""}`, href: result.url, kind: "note" as const }));
    return [...noteItems, { id: "search-all", title: `Все результаты для «${query.trim()}»`, description: "Открыть расширенный гибридный поиск", href: `/search?q=${encodeURIComponent(query.trim())}`, kind: "command" }];
  }, [query, results]);

  function navigate(item: CommandItem) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && items[active]) {
      event.preventDefault();
      navigate(items[active]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]" role="dialog" aria-modal="true" aria-label="Командный поиск">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Закрыть командный поиск" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <label className="flex items-center gap-3 border-b border-[var(--line)] px-4">
          <SearchIcon />
          <input ref={inputRef} value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setActive(0); if (!value.trim()) { setResults([]); setLoading(false); } }} onKeyDown={onInputKeyDown} className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none" placeholder="Найти заметку или выполнить команду…" role="combobox" aria-expanded="true" aria-controls="command-results" aria-activedescendant={items[active] ? `command-${items[active].id}` : undefined} />
          {loading ? <span className="text-xs text-[var(--muted)]">Ищу…</span> : <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">Esc</kbd>}
        </label>
        <div id="command-results" role="listbox" className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
          <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{query.trim() ? "Заметки и поиск" : "Быстрые переходы"}</div>
          {items.map((item, index) => (
            <button key={item.id} id={`command-${item.id}`} type="button" role="option" aria-selected={active === index} onMouseEnter={() => setActive(index)} onClick={() => navigate(item)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${active === index ? "bg-[color-mix(in_srgb,var(--accent)_13%,transparent)]" : "hover:bg-[var(--background)]"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-md border border-[var(--line)] ${active === index ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{item.kind === "note" ? <NoteIcon /> : <CommandIcon />}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--foreground)]">{item.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{item.description}</span></span>
              {active === index ? <span className="ml-auto text-[10px] text-[var(--muted)]">Enter</span> : null}
            </button>
          ))}
          {!loading && query.trim() && results.length === 0 ? <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">Точных совпадений нет — попробуйте расширенный поиск.</p> : null}
        </div>
        <div className="flex items-center gap-4 border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--muted)]"><span>↑↓ выбрать</span><span>↵ открыть</span><span>Esc закрыть</span></div>
      </div>
    </div>
  );
}

const Icon = ({ children }: { children: React.ReactNode }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">{children}</svg>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></Icon>;
const NoteIcon = () => <Icon><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6" /></Icon>;
const CommandIcon = () => <Icon><path d="M9 6V4a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v16a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2Z" /></Icon>;
