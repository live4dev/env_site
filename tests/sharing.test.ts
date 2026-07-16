import { describe, expect, it } from "vitest";
import { createPublicShareToken, isPublicShareToken } from "@/lib/notes/sharing";

describe("public article sharing", () => {
  it("creates unique 256-bit URL-safe tokens", () => {
    const tokens = Array.from({ length: 32 }, () => createPublicShareToken());

    expect(new Set(tokens)).toHaveLength(tokens.length);
    for (const token of tokens) {
      expect(token).toHaveLength(43);
      expect(isPublicShareToken(token)).toBe(true);
    }
  });

  it("rejects malformed share tokens before a database lookup", () => {
    expect(isPublicShareToken("short-token")).toBe(false);
    expect(isPublicShareToken("a".repeat(42))).toBe(false);
    expect(isPublicShareToken("a".repeat(44))).toBe(false);
    expect(isPublicShareToken(`${"a".repeat(42)}!`)).toBe(false);
  });
});
