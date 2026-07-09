export function ThemeScript() {
  const script = `
    const stored = localStorage.getItem("theme") || "system";
    const dark = stored === "dark" || (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
