import { FolderSectionPage } from "@/components/library/folder-section-page";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw } from "@/lib/notes/access";

export default async function OutputsPage() {
  const user = await requireUser();
  return <FolderSectionPage folder="outputs" title="Outputs" description="Готовые результаты и опубликованные материалы." rawAllowed={canAccessRaw(user)} />;
}
