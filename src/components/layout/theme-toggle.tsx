"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getAppliedTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const syncTheme = () => setTheme(getAppliedTheme());
    syncTheme();
    window.addEventListener("themechange", syncTheme);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncTheme);

    return () => {
      window.removeEventListener("themechange", syncTheme);
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
