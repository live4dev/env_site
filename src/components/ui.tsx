import Link from "next/link";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 ${className}`}>{children}</section>;
}

export function NoteLink({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className="block rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 hover:no-underline">
      <div className="font-medium text-[var(--foreground)]">{title}</div>
      {meta ? <div className="mt-1 text-xs text-[var(--muted)]">{meta}</div> : null}
    </Link>
  );
}
