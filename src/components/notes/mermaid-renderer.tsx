"use client";

import { useEffect } from "react";

function currentTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

function mermaidContainers() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-mermaid-source]"));
}

async function renderMermaid() {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: currentTheme(),
  });

  await Promise.all(
    mermaidContainers().map(async (container, index) => {
      const source = container.dataset.mermaidSource;
      if (!source) return;
      const id = `mermaid-${Date.now()}-${index}`;
      try {
        const { svg } = await mermaid.render(id, source);
        container.innerHTML = svg;
        container.removeAttribute("data-mermaid-error");
      } catch {
        container.dataset.mermaidError = "true";
        container.textContent = source;
      }
    }),
  );
}

function prepareMermaidBlocks() {
  document.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.dataset.mermaidPrepared === "true") return;

    const container = document.createElement("div");
    container.className = "mermaid-diagram";
    container.dataset.mermaidSource = code.textContent ?? "";
    pre.replaceWith(container);
    pre.dataset.mermaidPrepared = "true";
  });
}

export function MermaidRenderer() {
  useEffect(() => {
    let active = true;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (!active) return;
      prepareMermaidBlocks();
      void renderMermaid();
    };

    update();
    window.addEventListener("themechange", update);
    media.addEventListener("change", update);

    return () => {
      active = false;
      window.removeEventListener("themechange", update);
      media.removeEventListener("change", update);
    };
  }, []);

  return null;
}
