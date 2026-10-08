/**
 * 文档中心外观模式：跟随系统（默认）/ 亮色 / 暗色。
 *
 * - `data-theme-mode` 记录用户选择（system | light | dark）
 * - `data-theme` 记录实际生效的亮/暗结果，供 CSS `html[data-theme="dark"]` 使用
 * - `body[arco-theme="dark"]` 触发 Arco Design 自带的暗色主题变量
 */

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** localStorage key，与根布局内联脚本保持一致 */
export const THEME_STORAGE_KEY = "volc-doc-theme-mode";
/** 同标签页内广播模式变化的自定义事件名 */
export const THEME_CHANGE_EVENT = "volc-doc-theme-change";

const MODES: ThemeMode[] = ["system", "light", "dark"];

export function normalizeThemeMode(value: unknown): ThemeMode {
  return MODES.includes(value as ThemeMode) ? (value as ThemeMode) : "system";
}

/** 读取已保存的模式；无记录或异常时回退「跟随系统」。 */
export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** 当前操作系统偏好。 */
export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemTheme() : mode;
}

/**
 * 把模式写到 <html>/<body> 上。
 * @param persist 是否写入 localStorage（页面初始化对齐时传 false）
 */
export function applyThemeMode(mode: ThemeMode, persist = true): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  const normalized = normalizeThemeMode(mode);
  const isAdmin = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
  const theme = isAdmin ? "light" : resolveTheme(normalized);
  const root = document.documentElement;

  root.setAttribute("data-theme-mode", normalized);
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  document.body?.setAttribute(
    "arco-theme",
    theme === "dark" ? "dark" : "light",
  );

  // 切换瞬间禁用全部 CSS 过渡（顶栏等半透明背景有 0.2s+ 的
  // background 过渡，主题翻转时会呈现为一次明显闪烁），
  // 等主题切换后的首帧绘制完成再恢复。
  root.classList.add("theme-switching");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      /* 隐私模式等场景下静默失败 */
    }
  }

  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { mode: normalized, theme },
    }),
  );
  return theme;
}
