import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { ThemeScript } from "@/components/layout/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Environment Vault",
  description: "Private Obsidian vault website",
  robots: { index: false, follow: false },
};

const nav = [
  ["/", "Обзор"],
  ["/search", "Поиск"],
  ["/chat", "Вопросы"],
  ["/graph", "Граф"],
  ["/inputs", "Inputs"],
  ["/sources", "Источники"],
  ["/tags", "Теги"],
  ["/status", "Статус"],
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {user ? (
          <div className="min-h-screen">
            <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--background)]/95 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
                <Link href="/" className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
                  Vault
                </Link>
                <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
                  {nav.map(([href, label]) => (
                    <Link key={href} href={href} className="rounded-md px-3 py-2 text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--foreground)] hover:no-underline">
                      {label}
                    </Link>
                  ))}
                </nav>
                <Link href="/settings" className="hidden rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--foreground)] hover:no-underline sm:block">
                  {user.displayName}
                </Link>
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
            <KeyboardShortcuts />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
