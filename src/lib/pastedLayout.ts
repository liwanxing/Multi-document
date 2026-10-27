import type { CodeTabItem } from "./dataStore";

// 本文件保持自包含（仅类型导入），便于 node 单测直接加载。
//
// 从文档站（火山引擎、阿里云等）复制正文到 Markdown 编辑器时，页面上的
// 卡片组和代码 Tab 会退化成扁平文本：
//
//   [Card](https://.../quick-start-beginner)      ← 卡片占位链接
//
//   **快速入门(新手版)**
//
//   为零基础用户设计的快速入门
//
//   [文档检索 Skill](https://...)
//
//   安装 `ark-docs-reader`，让 Agent 自动检索并读取最新官方文档
//
//   **macOS**
//
//   ```Bash
//   export ARK_API_KEY="..."
//   ```
//
// Web 端没有原站的组件，只能显示成一行"Card"加一串竖排代码块。这里用两条
// 保守规则把这类结构还原成卡片 / Tab，命中条件不满足就原样交给 Markdown，
// 保证不吞内容。

/** 连续的「**标签** + 代码块」识别为多语言 Tab。 */
export interface PastedTabsResult {
  items: CodeTabItem[];
  next: number;
}

/** 「标题 + 单行说明」连续多组识别为导航卡片。 */
export interface PastedCardsResult {
  cols: number;
  items: { title: string; href: string; description: string }[];
  next: number;
}

const BOLD_LABEL_RE = /^\*\*([^*]{1,24})\*\*[：:]?$/;
const BOLD_TITLE_RE = /^\*\*([^*]{1,40})\*\*[：:]?$/;
const LINK_TITLE_RE = /^\[([^\]]{1,40})\]\((\S+)\)$/;
const CARD_PLACEHOLDER_RE = /^\[(?:card|卡片)\]\((\S+)\)$/i;
const FENCE_OPEN_RE = /^(`{3,}|~{3,})[ \t]*([^\s`~]*)/;

/** Tab 标签只接受 macOS / Windows_CMD 这类纯 ASCII 短标签。 */
function isTabishLabel(label: string): boolean {
  if (!label || label.length > 24) return false;
  if (!/^[\x20-\x7E]+$/.test(label)) return false;
  if (!/[A-Za-z]/.test(label)) return false;
  return true;
}

/** 卡片说明必须是短的单行文本，避免把正文段落当成说明。 */
function isDescriptionLine(text: string): boolean {
  if (!text || text.length > 80) return false;
  if (/[。！？；：.!?;:]$/.test(text)) return false;
  if (/^(?:`{3,}|~{3,}|#{1,6}\s|[-*+]\s|>\s|\||:::)/.test(text)) return false;
  if (/^\[[^\]]*\]\(\S+\)$/.test(text)) return false;
  return true;
}

/** 卡片标题/说明渲染为纯文本，去掉复制时带上的行内标记。 */
function cleanInline(text: string): string {
  return text
    .replace(/\\`/g, "`")
    .replace(/\[([^\]]*)\]\(\S+\)/g, "$1")
    .replace(/`+([^`]*)`+/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

function skipBlankLines(lines: string[], from: number, limit = 2) {
  let cursor = from;
  let skipped = 0;
  while (cursor < lines.length && !lines[cursor].trim()) {
    cursor++;
    skipped++;
    if (skipped > limit) return { cursor: from, skipped: limit + 1 };
  }
  return { cursor, skipped };
}

/**
 * 尝试把 `**macOS**` + 围栏代码块 连续多组解析成多语言 Tab。
 * 至少两组才转换；`next` 指向最后一组之后的第一个位置。
 */
export function tryParsePastedTabs(
  lines: string[],
  start: number,
): PastedTabsResult | null {
  const items: CodeTabItem[] = [];
  let idx = start;

  while (idx < lines.length) {
    const labelMatch = BOLD_LABEL_RE.exec(lines[idx].trim());
    if (!labelMatch) break;
    const label = labelMatch[1].trim();
    if (!isTabishLabel(label)) break;

    const afterLabel = skipBlankLines(lines, idx + 1);
    if (afterLabel.skipped > 2) break;

    const fenceLine = lines[afterLabel.cursor];
    if (fenceLine === undefined) break;
    const fenceMatch = FENCE_OPEN_RE.exec(fenceLine.trim());
    if (!fenceMatch) break;

    const fence = fenceMatch[1];
    const syntax = (fenceMatch[2] || "").toLowerCase();
    const codeLines: string[] = [];
    let cursor = afterLabel.cursor + 1;
    let closed = false;
    while (cursor < lines.length) {
      const current = lines[cursor];
      if (current.trim().startsWith(fence)) {
        closed = true;
        cursor++;
        break;
      }
      codeLines.push(current);
      cursor++;
    }
    if (!closed) break;

    items.push({
      language: label,
      syntax: syntax || "plaintext",
      code: codeLines.join("\n").trim(),
    });

    const afterFence = skipBlankLines(lines, cursor);
    if (afterFence.skipped > 2) break;
    idx = afterFence.cursor;
  }

  if (items.length < 2) return null;
  return { items, next: idx };
}

/**
 * 尝试把「卡片标题 + 单行说明」连续多组解析成导航卡片。
 * 标题可以是 `**标题**`、`[标题](url)`，也可以由上一行的
 * `[Card](url)` 占位链接提供跳转地址。至少两组才转换。
 */
export function tryParsePastedCards(
  lines: string[],
  start: number,
): PastedCardsResult | null {
  const items: { title: string; href: string; description: string }[] = [];
  let idx = start;
  // 有 [Card](url) 占位行时两组即可；纯加粗标题需要三组，避免把
  // 手写的「加粗小标题 + 一句话」误合成卡片。
  let seeded = false;

  while (idx < lines.length) {
    let cursor = idx;
    let href = "";
    let title = "";

    const placeholder = CARD_PLACEHOLDER_RE.exec(lines[cursor].trim());
    if (placeholder) {
      href = placeholder[1];
      if (cursor === start) seeded = true;
      const afterPlaceholder = skipBlankLines(lines, cursor + 1);
      if (!afterPlaceholder.skipped) break;
      cursor = afterPlaceholder.cursor;
    }
    if (cursor >= lines.length) break;

    const head = lines[cursor].trim();
    const bold = BOLD_TITLE_RE.exec(head);
    const link = LINK_TITLE_RE.exec(head);
    if (bold) {
      title = bold[1].trim();
    } else if (link) {
      title = link[1].trim();
      href = href || link[2];
    } else {
      break;
    }

    // 标题与说明之间必须空行，避免把「加粗小标题 + 正文」误判为卡片。
    const afterTitle = skipBlankLines(lines, cursor + 1);
    if (!afterTitle.skipped) break;

    const description = (lines[afterTitle.cursor] || "").trim();
    if (!isDescriptionLine(description)) break;

    // 说明之后必须是空行或文末，否则说明还有后续段落不属于卡片。
    const afterDesc = afterTitle.cursor + 1;
    if (afterDesc < lines.length && lines[afterDesc].trim()) break;

    items.push({ title: cleanInline(title), href, description: cleanInline(description) });

    const nextGroup = skipBlankLines(lines, afterDesc);
    if (nextGroup.skipped > 2) {
      idx = afterDesc;
      break;
    }
    idx = nextGroup.cursor;
  }

  if (items.length < (seeded ? 2 : 3)) return null;
  return { cols: Math.min(3, items.length), items, next: idx };
}
