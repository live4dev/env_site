import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/browser/copy-text";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("uses the Clipboard API when it is allowed", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyText("https://example.test/note")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.test/note");
  });

  it("falls back when the Clipboard API rejects", async () => {
    const remove = vi.fn();
    const input = {
      value: "",
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove,
    };
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(input),
      body: { appendChild: vi.fn() },
      execCommand,
    });

    await expect(copyText("https://example.test/note")).resolves.toBe(true);
    expect(input.value).toBe("https://example.test/note");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(remove).toHaveBeenCalledOnce();
  });
});
