import GithubSlugger from "github-slugger";

export function noteSlug(vaultPath: string) {
  return vaultPath
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .split("/")
    .map((part) => part.trim().replace(/\s+/g, "-"))
    .join("/");
}

export function headingAnchor(heading: string) {
  const slugger = new GithubSlugger();
  return slugger.slug(heading);
}

export function titleFromPath(vaultPath: string) {
  const filename = vaultPath.split("/").pop() ?? vaultPath;
  return filename.replace(/\.md$/i, "");
}
