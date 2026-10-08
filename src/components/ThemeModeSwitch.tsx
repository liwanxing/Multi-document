"use client";

import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { Tooltip } from "@arco-design/web-react";
import {
  applyThemeMode,
  readThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme";

const ICONS: Record<ThemeMode, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABELS: Record<ThemeMode, string> = {
  system: "跟随系统 · 点击切换亮色",
  light: "亮色模式 · 点击切换暗色",
  dark: "暗色模式 · 点击切换跟随系统",
};

/** 点击循环：跟随系统 → 亮色 → 暗色 → 跟随系统 */
const NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/**
 * 文档预览页外观模式切换：单个图标按钮，点击在
 * 跟随系统（默认）/ 亮色 / 暗色 之间循环切换。
 * 选择会持久化到 localStorage，并同步 <html data-theme> 与 Arco 的
 * `body[arco-theme]` 暗色变量。
 */
export default function ThemeModeSwitch() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    setMode(readThemeMode());

    const onModeChange = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { mode?: ThemeMode }
        | undefined;
      if (detail?.mode) setMode(detail.mode);
    };

    window.addEventListener(THEME_CHANGE_EVENT, onModeChange);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onModeChange);
    };
  }, []);

  const Icon = ICONS[mode];
  const label = LABELS[mode];

  return (
    <Tooltip content={label} position="top">
      <button
        type="button"
        className="doc-theme-switch"
        data-mode={mode}
        aria-label={label}
        title={label}
        onClick={() => {
          const next = NEXT[mode];
          setMode(next);
          applyThemeMode(next);
        }}
      >
        <Icon size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
