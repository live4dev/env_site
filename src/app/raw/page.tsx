import { FolderSectionPage } from "@/components/library/folder-section-page";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw } from "@/lib/notes/access";
import { notFound } from "next/navigation";

export default async function RawPage() {
  const user = await requireUser();
  if (!canAccessRaw(user)) notFound();
  return <FolderSectionPage folder="raw" title="Raw" description="Необработанные материалы с ограниченным доступом." rawAllowed />;
}
