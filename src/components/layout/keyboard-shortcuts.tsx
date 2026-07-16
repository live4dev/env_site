"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyTheme, getAppliedTheme } from "@/lib/browser/theme";

export function KeyboardShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let g = false;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        window.dispatchEvent(new Event("vault:command"));
      }
      if (event.key === "t" && !typing) {
        applyTheme(getAppliedTheme() === "dark" ? "light" : "dark");
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
