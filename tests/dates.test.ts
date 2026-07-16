import { describe, expect, it } from "vitest";
import { toDate } from "@/lib/dates";

describe("date conversion", () => {
  it("normalizes database timestamp strings", () => {
    expect(toDate("2026-07-16 16:00:00+00").toISOString()).toBe("2026-07-16T16:00:00.000Z");
  });

  it("preserves Date instances", () => {
    const date = new Date("2026-07-16T16:00:00.000Z");
    expect(toDate(date)).toBe(date);
  });

  it("rejects invalid timestamps", () => {
    expect(() => toDate("not-a-date")).toThrow("Invalid date value");
  });
});
