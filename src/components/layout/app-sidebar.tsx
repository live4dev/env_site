"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type FolderNode = { name: string; path: string; children: FolderNode[] };

type SidebarUser = {
  displayName: string;
  role: "admin" | "user";
  canAccessRaw: boolean;
};

export function AppSidebar({ folders, user }: { folders: string[]; user: SidebarUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  return <>
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 lg:hidden">
      <button type="button" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-md border border-[var(--line)]" aria-label="Открыть навигацию">
        <MenuIcon />
      </button>
      <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--foreground)] hover:no-underline">Vault</Link>
      <ThemeToggle />
    </header>

    {mobileOpen ? <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Закрыть навигацию" /> : null}

    <aside onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }} className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col border-r border-[var(--line)] bg-[var(--panel)] transition-transform lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[280px] lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--foreground)] hover:no-underline">Vault</Link>
        <div className="flex items-center gap-1">
          <div className="hidden lg:block"><ThemeToggle /></div>
          <button type="button" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-md text-[var(--muted)] lg:hidden" aria-label="Закрыть навигацию">×</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <form action="/search" className="mb-5">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus-within:border-[var(--accent)]">
            <SearchIcon />
            <input data-global-search name="q" className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Поиск по базе…" />
            <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">/</kbd>
          </label>
        </form>

        <NavGroup label="Рабочее">
          <NavLink href="/" label="Обзор" icon={<HomeIcon />} active={pathname === "/"} />
          <NavLink href="/chat" label="Вопросы" icon={<ChatIcon />} active={isActive(pathname, "/chat")} />
        </NavGroup>

        <NavGroup label="Хранилище">
          <NavLink href="/inputs" label="Входящие" meta="Inputs" icon={<FolderIcon />} active={isActive(pathname, "/inputs")} />
          <NavLink href="/outputs" label="Результаты" meta="Outputs" icon={<FolderIcon />} active={isActive(pathname, "/outputs")} />
          {user.role === "admin" || user.canAccessRaw ? <NavLink href="/raw" label="Исходники" meta="Raw" icon={<LockIcon />} active={isActive(pathname, "/raw")} /> : null}
          <details className="group/tree mt-1" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] [&::-webkit-details-marker]:hidden">
              <ChevronIcon />
              <FolderTreeIcon />
              <span>Все папки</span>
            </summary>
            <div className="ml-4 border-l border-[var(--line)] pl-2">
              {tree.length ? tree.map((node) => <TreeNode key={node.path} node={node} pathname={pathname} />) : <span className="block px-2 py-2 text-xs text-[var(--muted)]">Папки не найдены</span>}
            </div>
          </details>
        </NavGroup>

        <NavGroup label="Представления">
          <NavLink href="/tags" label="Теги" icon={<TagIcon />} active={isActive(pathname, "/tags")} />
          <NavLink href="/sources" label="Источники" icon={<SourceIcon />} active={isActive(pathname, "/sources")} />
          <NavLink href="/graph" label="Граф" icon={<GraphIcon />} active={isActive(pathname, "/graph")} />
        </NavGroup>

        {user.role === "admin" ? <NavGroup label="Система">
          <NavLink href="/status" label="Статус" icon={<StatusIcon />} active={isActive(pathname, "/status")} />
          <NavLink href="/admin/users" label="Пользователи" icon={<UsersIcon />} active={isActive(pathname, "/admin/users")} />
          <NavLink href="/admin/reindex" label="Переиндексация" icon={<RefreshIcon />} active={isActive(pathname, "/admin/reindex")} />
        </NavGroup> : null}
      </div>

      <div className="shrink-0 border-t border-[var(--line)] p-3">
        <Link href="/settings" className={`flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--background)] hover:no-underline ${isActive(pathname, "/settings") ? "bg-[var(--background)]" : ""}`}>
          <span className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">{user.displayName.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--foreground)]">{user.displayName}</span><span className="block text-xs text-[var(--muted)]">{user.role === "admin" ? "Администратор" : "Пользователь"}</span></span>
        </Link>
      </div>
    </aside>
  </>;
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="mb-5"><h2 className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</h2><nav className="grid gap-0.5">{children}</nav></section>;
}

function NavLink({ href, label, meta, icon, active }: { href: string; label: string; meta?: string; icon: React.ReactNode; active: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:no-underline ${active ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]" : "text-[var(--foreground)] hover:bg-[var(--background)]"}`}>
    <span className="shrink-0 text-[var(--muted)]">{icon}</span><span>{label}</span>{meta ? <span className="ml-auto text-[10px] text-[var(--muted)]">{meta}</span> : null}
  </Link>;
}

function TreeNode({ node, pathname }: { node: FolderNode; pathname: string }) {
  const href = `/folders/${node.path.split("/").map(encodeURIComponent).join("/")}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  if (!node.children.length) return <Link href={href} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:no-underline ${active ? "font-medium text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"}`}><FolderIcon /><span className="truncate">{node.name}</span></Link>;
  return <details className="group/folder" open={active}>
    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md py-1.5 pr-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden"><ChevronIcon /><Link href={href} className={`flex min-w-0 items-center gap-2 hover:no-underline ${active ? "font-medium text-[var(--accent)]" : "text-inherit"}`}><FolderIcon /><span className="truncate">{node.name}</span></Link></summary>
    <div className="ml-3 border-l border-[var(--line)] pl-1">{node.children.map((child) => <TreeNode key={child.path} node={child} pathname={pathname} />)}</div>
  </details>;
}

function buildFolderTree(folders: string[]) {
  const roots: FolderNode[] = [];
  const pinned = new Set(["inputs", "outputs", "raw"]);
  for (const folder of folders) {
    const parts = folder.split("/").filter(Boolean);
    if (!parts.length || pinned.has(parts[0].toLowerCase())) continue;
    let level = roots;
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      let node = level.find((item) => item.name === part);
      if (!node) { node = { name: part, path: current, children: [] }; level.push(node); }
      level = node.children;
    }
  }
  const sort = (nodes: FolderNode[]) => nodes.sort((a, b) => a.name.localeCompare(b.name, "ru")).forEach((node) => sort(node.children));
  sort(roots);
  return roots;
}

function isActive(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`); }
const Icon = ({ children }: { children: React.ReactNode }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">{children}</svg>;
const MenuIcon = () => <Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></Icon>;
const HomeIcon = () => <Icon><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></Icon>;
const ChatIcon = () => <Icon><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></Icon>;
const FolderIcon = () => <Icon><path d="M3 6h6l2 2h10v11H3Z" /></Icon>;
const LockIcon = () => <Icon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>;
const FolderTreeIcon = () => <Icon><path d="M3 5h6l2 2h10v11H3Z" /></Icon>;
const ChevronIcon = () => <Icon><path className="origin-center transition-transform group-open/tree:rotate-90 group-open/folder:rotate-90" d="m9 18 6-6-6-6" /></Icon>;
const TagIcon = () => <Icon><path d="M20 13 13 20 3 10V3h7Z" /><circle cx="7.5" cy="7.5" r="1" /></Icon>;
const SourceIcon = () => <Icon><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" /></Icon>;
const GraphIcon = () => <Icon><circle cx="5" cy="12" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="m7 11 9-5M7 13l9 5" /></Icon>;
const StatusIcon = () => <Icon><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></Icon>;
const UsersIcon = () => <Icon><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 7" /></Icon>;
const RefreshIcon = () => <Icon><path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3" /></Icon>;
