import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";

const execFileAsync = promisify(execFile);

export async function POST() {
  await requireAdmin();
  const result = await execFileAsync("npm", ["run", "index:vault"], { cwd: process.cwd(), timeout: 1000 * 60 * 15 });
  return NextResponse.json({ ok: true, stdout: result.stdout, stderr: result.stderr });
}
