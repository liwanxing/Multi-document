"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyThemeMode, readThemeMode, THEME_STORAGE_KEY } from "@/lib/theme";

/** Keep the global theme in sync even on pages without a theme switch. */
export default function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => applyThemeMode(readThemeMode(), false);
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) sync();
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readThemeMode() === "system") sync();
    };
    window.addEventListener("storage", onStorage);
    media.addEventListener("change", onSystemChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      media.removeEventListener("change", onSystemChange);
    };
  }, [pathname]);
  return null;
}
