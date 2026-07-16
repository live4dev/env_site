import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "@/lib/browser/theme";

function initializeTheme({
  stored,
  systemDark,
  storageThrows = false,
}: {
  stored: string | null;
  systemDark: boolean;
  storageThrows?: boolean;
}) {
  let dark = false;
  let colorScheme = "";

  vm.runInNewContext(THEME_INIT_SCRIPT, {
    window: {
      localStorage: {
        getItem() {
          if (storageThrows) throw new Error("Storage unavailable");
          return stored;
        },
      },
      matchMedia() {
        return { matches: systemDark };
      },
    },
    document: {
      documentElement: {
        classList: {
          toggle(_name: string, enabled: boolean) {
            dark = enabled;
          },
        },
        style: {
          set colorScheme(value: string) {
            colorScheme = value;
          },
        },
      },
    },
  });

  return { dark, colorScheme };
}

describe("theme initialization", () => {
  it("restores a saved dark theme", () => {
    expect(initializeTheme({ stored: "dark", systemDark: false })).toEqual({
      dark: true,
      colorScheme: "dark",
    });
  });

  it("keeps a saved light theme when the system is dark", () => {
    expect(initializeTheme({ stored: "light", systemDark: true })).toEqual({
      dark: false,
      colorScheme: "light",
    });
  });

  it("uses the system theme when no preference is saved", () => {
    expect(initializeTheme({ stored: null, systemDark: true })).toEqual({
      dark: true,
      colorScheme: "dark",
    });
  });

  it("still initializes from the system theme when storage is unavailable", () => {
    expect(initializeTheme({ stored: null, systemDark: true, storageThrows: true })).toEqual({
      dark: true,
      colorScheme: "dark",
    });
  });
});
