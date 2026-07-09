"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let g = false;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("[data-global-search]")?.focus();
      }
      if (event.key === "t" && !typing) {
        const root = document.documentElement;
        const next = root.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem("theme", next);
        root.classList.toggle("dark", next === "dark");
      }
      if (event.key === "g" && !typing) {
        if (g) {
          router.push("/graph");
          g = false;
        } else {
          g = true;
          setTimeout(() => (g = false), 900);
        }
        return;
      }
      if (!g || typing) return;
      if (event.key === "h") router.push("/");
      if (event.key === "s") router.push("/search");
      if (event.key === "c") router.push("/chat");
      g = false;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}
