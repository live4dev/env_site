import { promises as fs } from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { csv, env } from "@/lib/config";

export async function listVaultMarkdownFiles() {
  const root = env.VAULT_ROOT;
  const include = csv(env.VAULT_INCLUDE_GLOBS);
  const exclude = csv(env.VAULT_EXCLUDE_GLOBS);
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      if (exclude.some((glob) => minimatch(relative, glob, { dot: true }))) continue;
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && relative.endsWith(".md") && include.some((glob) => minimatch(relative, glob, { dot: true }))) {
        files.push(relative);
      }
    }
  }

  await walk(root);
  return files.sort();
}

export async function readVaultFile(vaultPath: string) {
  const absolute = path.join(env.VAULT_ROOT, vaultPath);
  return fs.readFile(absolute, "utf8");
}
