import { describe, expect, it } from "vitest";
import { shortRevision } from "@/lib/version";

describe("shortRevision", () => {
  it("shortens a full Git commit SHA", () => {
    expect(shortRevision("41958174448971c94cf4b2a20ab1e874cb26edfa")).toBe("4195817");
  });

  it("keeps an already short Git revision", () => {
    expect(shortRevision("4195817")).toBe("4195817");
  });

  it("ignores missing or invalid revisions", () => {
    expect(shortRevision(undefined)).toBeUndefined();
    expect(shortRevision("development")).toBeUndefined();
  });
});
