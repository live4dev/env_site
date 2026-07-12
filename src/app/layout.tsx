import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { ThemeScript } from "@/components/layout/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Environment Vault",
  description: "Private Obsidian vault website",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const folderRows = user ? await db.selectDistinct({ folder: notes.folder }).from(notes).where(visibleNotesFilter(canAccessRaw(user))).orderBy(asc(notes.folder)).limit(1000) : [];
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {user ? (
          <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <AppSidebar folders={folderRows.map((row) => row.folder).filter(Boolean)} user={user} />
            <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">{children}</div></main>
            <KeyboardShortcuts />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
