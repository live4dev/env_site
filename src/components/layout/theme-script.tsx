import { THEME_INIT_SCRIPT } from "@/lib/browser/theme";

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
