import { describe, expect, it } from "vitest";
import { canAccessRaw, isRawPath } from "@/lib/notes/access";

describe("raw access", () => {
  it("allows admins and explicitly permitted users", () => {
    expect(canAccessRaw({ role: "admin", canAccessRaw: false })).toBe(true);
    expect(canAccessRaw({ role: "user", canAccessRaw: true })).toBe(true);
    expect(canAccessRaw({ role: "user", canAccessRaw: false })).toBe(false);
  });

  it("recognizes the raw root without matching similar folder names", () => {
    expect(isRawPath("raw/note.md")).toBe(true);
    expect(isRawPath("Raw/note.md")).toBe(true);
    expect(isRawPath("raw-materials/note.md")).toBe(false);
    expect(isRawPath("outputs/raw.md")).toBe(false);
  });
});
