"use client";

import { useEffect, useState } from "react";
import { applyTheme, getAppliedTheme, THEME_CHANGE_EVENT, type Theme } from "@/lib/browser/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const syncTheme = () => setTheme(getAppliedTheme());
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncTheme);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", syncTheme);
    };
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Переключить на ${nextTheme === "dark" ? "темную" : "светлую"} тему`}
      title="Переключить тему"
      onClick={() => applyTheme(nextTheme)}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--foreground)] hover:bg-[var(--line)]"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {theme === "dark" ? "☾" : "☼"}
      </span>
    </button>
  );
}
