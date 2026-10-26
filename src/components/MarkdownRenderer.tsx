"use client";

import { safeComponentStyle } from "@/lib/componentStyle";
import { writeClipboard } from "@/lib/clipboard";
import { Image } from "@arco-design/web-react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { marked } from "marked";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import CodeTabs from "./CodeTabs";
import MermaidChart from "./MermaidChart";
import { CodeTabItem } from "@/lib/dataStore";
import { parseHtmlTabs, formatTabLabel } from "@/lib/htmlTabs";
import hljs from "highlight.js";
import { sanitizeMarkup } from "@/lib/safeMarkdown";
import { defaultAppearance, type DocAppearance } from "@/lib/editor";
import { getIconItem, renderIconSvg } from "@/lib/iconRegistry";
import {
  getHighlightLang,
  formatDisplayLang,
  splitHighlightedHtmlLines,
} from "@/lib/codeHighlight";

export function replaceInlineIcons(text: string): string {
  if (!text) return "";
  return text.replace(
    /\[icon:([^\]]+)\]|:icon\[([^\]]+)\]:/gi,
    (_, p1, p2) => {
      const iconQuery = (p1 || p2 || "").trim();
      const iconItem = getIconItem(iconQuery);
      const title = iconItem ? `${iconItem.name} (${iconItem.id})` : iconQuery;
      const svg = renderIconSvg(iconQuery, { size: 16 });
      return `<span class="doc-inline-icon" title="${title}" data-icon="${iconQuery}">${svg}</span>`;
    },
  );
}
import {
  DocCards,
  DocFeatures,
  DocPromptPreview,
  DocVideoGrid,
  DocMultimodal,
  DocStoryboard,
  DocKeyframes,
  DocFileAttachment,
  DocBannerCards,
  DocCapabilities,
  DocProTable,
  DocApiExplorer,
  DocApiParams,
  type CardItem,
  type FeatureItem,
  type MediaGridItem,
  type StoryboardAsset,
  type KeyframeItem,
  type BannerCardItem,
  type CapabilityItem,
  type ApiParamItem,
} from "./DocComponents";

function readContainer(lines: string[], start: number) {
  const content: string[] = [];
  let depth = 1;
  let fence = "";
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i],
      match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length)
        fence = "";
    }
    if (!fence && !match) {
      if (/^:::\w/.test(line.trim())) depth++;
      else if (line.trim() === ":::") depth--;
      if (!depth) return { content, next: i + 1 };
    }
    content.push(line);
  }
  return { content, next: i };
}

function dedentLines(lines: string[]): string[] {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines;
  const minIndent = Math.min(
    ...nonEmpty.map((l) => {
      const m = /^\s*/.exec(l);
      return m ? m[0].length : 0;
    })
  );
  if (minIndent === 0) return lines;
  return lines.map((l) => (l.length >= minIndent ? l.slice(minIndent) : l.trimStart()));
}

// Configure marked with highlight.js renderer and heading id
const baseRenderer = new marked.Renderer();
marked.use({
  renderer: {
    table(token) {
      return `<div class="doc-table-scroll">${baseRenderer.table.call(this, token)}</div>`;
    },
    heading({ text, depth, tokens }) {
      const cleanId = (text || "")
        .replace(/<[^>]*>/g, "")
        .replace(/`|[*_~]/g, "")
        .trim()
        .replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
      return `<h${depth} id="${cleanId}">${this.parser.parseInline(tokens)}</h${depth}>`;
    },
    code(arg: any) {
      let text = "";
      let lang = "";
      if (typeof arg === "object" && arg !== null) {
        text = arg.text || "";
        lang = arg.lang || "";
      } else if (typeof arg === "string") {
        text = arg;
        lang = (arguments[1] as string) || "";
      }
      const rawLang = (lang || "plaintext").trim().split(" ")[0].toLowerCase();
      const validLang = getHighlightLang(rawLang);
      let highlighted = "";
      try {
        highlighted = hljs.highlight(text, {
          language: validLang,
          ignoreIllegals: true,
        }).value;
      } catch {
        highlighted = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      const displayLang = formatDisplayLang(rawLang);
      const cleanText = text.endsWith("\n") ? text.slice(0, -1) : text;
      const lines = cleanText ? cleanText.split("\n") : [""];
      const lineCount = lines.length;
      const splitLines = splitHighlightedHtmlLines(highlighted);
      const numWidth = lineCount >= 1000 ? "w-12" : lineCount >= 100 ? "w-10" : "w-8";

      const linesHtml = splitLines
        .map(
          (lineHtml, i) =>
            `<div class="doc-code-line flex items-start min-h-[1.5rem]"><span aria-hidden="true" class="doc-code-linenumber select-none pr-4 text-right text-[#86909c] shrink-0 font-mono text-xs ${numWidth} sticky left-0 bg-white z-10 font-medium leading-6">${i + 1}</span><span class="doc-code-linecontent flex-1 min-w-0 font-mono text-xs leading-6 text-[#1d2129] whitespace-pre-wrap break-all">${lineHtml || "<br/>"}</span></div>`,
        )
        .join("");

      return `<div class="my-6 rounded-xl border border-[#e5e6eb] bg-white shadow-none p-5 md:p-6 overflow-hidden doc-code-box">
        <div class="flex items-center justify-between pb-3 text-xs text-[#86909c]">
          <span class="font-mono text-[#86909c] text-xs font-normal">${displayLang}</span>
          <button type="button" data-code="${encodeURIComponent(cleanText)}" class="doc-code-copy-btn flex items-center gap-1.5 text-xs text-[#4e5969] hover:text-[#1d2129] transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer" title="复制代码">
            <svg class="copy-icon w-3.5 h-3.5 text-[#86909c] shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <svg class="check-icon w-3.5 h-3.5 text-green-600 shrink-0 hidden" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            <span class="copy-text select-none">复制</span>
          </button>
        </div>
        <div class="font-mono text-xs leading-6 overflow-hidden relative">
          <pre class="m-0 p-0 bg-transparent text-[#1d2129] font-mono leading-6 w-full"><code class="block font-mono text-xs leading-6 hljs-light bg-transparent w-full" style="background-color: transparent">${linesHtml}</code></pre>
        </div>
      </div>`;
    },
  },
});

interface MarkdownRendererProps {
  content: string;
  appearance?: DocAppearance;
}

export default function MarkdownRenderer({
  content,
  appearance: appearanceProp,
}: MarkdownRendererProps) {
  // appearance 可能为 null（如数据库 NULL 直接透传），null 不触发默认值，需显式兜底
  const appearance = appearanceProp ?? defaultAppearance;
  // Parse Markdown with all tech extensions
  const [zoom, setZoom] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    el.querySelectorAll("img").forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `放大图片：${img.alt || "文档图片"}`);
    });

    const handleCopyClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(".doc-code-copy-btn");
      if (!btn || !el.contains(btn)) return;

      const codeBox = btn.closest(".doc-code-box");
      const rawCode = btn.getAttribute("data-code");
      let text = "";
      if (rawCode) {
        text = decodeURIComponent(rawCode);
      } else {
        const lineContents = codeBox?.querySelectorAll(".doc-code-linecontent");
        if (lineContents && lineContents.length > 0) {
          text = Array.from(lineContents)
            .map((c) => c.textContent || "")
            .join("\n");
        } else {
          text = codeBox?.querySelector("pre code")?.textContent || "";
        }
      }
      const copyText = btn.querySelector(".copy-text");

      // http 部署下没有 navigator.clipboard，交给 writeClipboard 兼容
      void writeClipboard(text).then((ok) => {
        if (ok) {
          btn.classList.add("copied");
          if (copyText) copyText.textContent = "已复制";
          setTimeout(() => {
            btn.classList.remove("copied");
            if (copyText) copyText.textContent = "复制";
          }, 2000);
        } else {
          if (copyText) copyText.textContent = "复制失败";
          setTimeout(() => {
            if (copyText) copyText.textContent = "复制";
          }, 2000);
        }
      });
    };

    el.addEventListener("click", handleCopyClick);
    return () => {
      el.removeEventListener("click", handleCopyClick);
    };
  });
  const parsedSections = useMemo(() => {
    const rawLines = content.replace(/\r\n/g, "\n").split("\n");
    const sections: Array<
      | { type: "markdown"; html: string }
      | { type: "tabs"; items: CodeTabItem[] }
      | {
          type: "compare";
          inputTitle: string;
          inputText: string;
          outputTitle: string;
          outputText: string;
        }
      | {
          type: "callout";
          level: "note" | "tip" | "important" | "warning" | "danger";
          title: string;
          content: string;
        }
      | { type: "styled"; content: string; className: string; style: string }
      | { type: "details"; title: string; html: string }
      | { type: "mermaid"; code: string }
      | { type: "math_block"; formula: string }
      | { type: "cards"; cols: number; items: CardItem[] }
      | { type: "features"; cols: number; items: FeatureItem[] }
      | {
          type: "prompt_preview";
          promptTitle: string;
          promptText: string;
          previewTitle: string;
          previewHtml: string;
          previewSrc: string;
        }
      | { type: "video_grid"; cols: number; items: MediaGridItem[] }
      | {
          type: "multimodal";
          inputTitle: string;
          inputRaw: string;
          outputTitle: string;
          outputRaw: string;
        }
      | {
          type: "storyboard";
          scriptTitle: string;
          scriptText: string;
          mainImageSrc: string;
          mainImageAlt: string;
          assets: StoryboardAsset[];
        }
      | {
          type: "keyframes";
          prompt: string;
          cols: number;
          items: KeyframeItem[];
        }
      | {
          type: "file";
          name: string;
          url: string;
          size?: string;
        }
      | {
          type: "banner_cards";
          cols: number;
          items: BannerCardItem[];
        }
      | {
          type: "capabilities";
          title?: string;
          description?: string;
          items: CapabilityItem[];
        }
      | {
          type: "pro_table";
          headers: string[];
          rows: string[][];
          aligns: ("left" | "center" | "right")[];
        }
      | {
          type: "api_explorer";
          title: string;
          description: string;
          buttonText: string;
          href: string;
        }
      | {
          type: "api_params";
          title?: string;
          subtitle?: string;
          items: ApiParamItem[];
        }
    > = [];

    let currentMarkdownBuffer: string[] = [];

    const flushMarkdown = () => {
      if (currentMarkdownBuffer.length > 0) {
        let rawMd = currentMarkdownBuffer.join("\n");
        const protectedCode: string[] = [];
        const renderedMath: string[] = [];
        rawMd = rawMd.replace(
          /(`{3,}|~{3,})[^\n]*\n[\s\S]*?\1|`+[^`\n]*`+/g,
          (value) => {
            protectedCode.push(value);
            return `CODETOKEN${protectedCode.length - 1}ENDTOKEN`;
          },
        );

        // Process Inline Badges: e.g. <Badge type="post">POST</Badge> or [Badge:GET]
        rawMd = rawMd.replace(
          /<Badge\s+type="(\w+)">([^<]+)<\/Badge>/gi,
          (_, type, text) => {
            const colorClass =
              type === "post" || type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : type === "get" || type === "info"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : type === "put" || type === "warning"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : type === "delete" || type === "danger"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-gray-100 text-gray-700 border-gray-200";
            return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${colorClass}">${text}</span>`;
          },
        );

        // Process Inline KaTeX: $formula$
        rawMd = rawMd.replace(/\$([^\$\n]+)\$/g, (_, eq) => {
          try {
            renderedMath.push(
              katex.renderToString(eq, {
                throwOnError: false,
                displayMode: false,
                trust: false,
              }),
            );
            return `MATHTOKEN${renderedMath.length - 1}ENDTOKEN`;
          } catch {
            return `$${eq}$`;
          }
        });

        // Process Highlight Text: ==text==
        rawMd = rawMd.replace(
          /==([^=]+)==/g,
          '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-normal">$1</mark>',
        );

        // Process Kbd: <kbd>key</kbd>
        rawMd = rawMd.replace(
          /<kbd>([^<]+)<\/kbd>/gi,
          '<kbd class="px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 border border-gray-300 rounded shadow-sm">$1</kbd>',
        );

        // Process Inline Icons: [icon:name] or :icon[name]:
        rawMd = replaceInlineIcons(rawMd);

        rawMd = rawMd.replace(
          /CODETOKEN(\d+)ENDTOKEN/g,
          (_, index) => protectedCode[Number(index)],
        );
        // Convert GFM to HTML
        const html = marked.parse(rawMd, { gfm: true, breaks: true }) as string;
        sections.push({
          type: "markdown",
          html: sanitizeMarkup(html).replace(
            /MATHTOKEN(\d+)ENDTOKEN/g,
            (token, index) => renderedMath[Number(index)] || token,
          ),
        });
        currentMarkdownBuffer = [];
      }
    };

    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i];

      const trimmedLine = line.trim();
      if (trimmedLine.startsWith(":::styled")) {
        flushMarkdown();
        let config: { className?: string; style?: string } = {};
        const configStr = trimmedLine.slice(9).trim();
        if (configStr) {
          try {
            const parsed = JSON.parse(configStr);
            if (parsed && typeof parsed === "object") {
              config = {
                className: typeof parsed.className === "string" ? parsed.className : "",
                style: typeof parsed.style === "string" ? parsed.style : "",
              };
            }
          } catch {}
        }
        i++;
        const collected = readContainer(rawLines, i);
        const nested = collected.content;
        i = collected.next;
        sections.push({
          type: "styled",
          content: nested.join("\n"),
          className: config.className || "",
          style: config.style || "",
        });
        continue;
      }
      // Mermaid diagram block
      if (line.trim().startsWith("```mermaid")) {
        flushMarkdown();
        i++;
        const mermaidLines: string[] = [];
        while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
          mermaidLines.push(rawLines[i]);
          i++;
        }
        i++; // skip closing ```
        sections.push({ type: "mermaid", code: mermaidLines.join("\n") });
        continue;
      }

      // Keep ordinary fenced code intact: extensions inside examples are literal.
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        currentMarkdownBuffer.push(line);
        i++;
        while (i < rawLines.length) {
          const next = rawLines[i++];
          currentMarkdownBuffer.push(next);
          if (next.trim().startsWith(fence[1])) break;
        }
        continue;
      }

      // Block Math equation: $$...$$
      if (line.trim().startsWith("$$")) {
        flushMarkdown();
        if (line.trim().length > 4 && line.trim().endsWith("$$")) {
          sections.push({
            type: "math_block",
            formula: line.trim().slice(2, -2),
          });
          i++;
          continue;
        }
        i++;
        const mathLines: string[] = [];
        while (i < rawLines.length && !rawLines[i].trim().startsWith("$$")) {
          mathLines.push(rawLines[i]);
          i++;
        }
        i++; // skip closing $$
        sections.push({ type: "math_block", formula: mathLines.join("\n") });
        continue;
      }

      // Volcengine-style HTML tabs pasted from doc sites:
      // <Tabs>…<Tab title="Curl">…```Bash …```…</Tab>…</Tabs>
      // Only the strict standalone-tag form is converted; anything else
      // falls through to plain Markdown so no pasted content is lost.
      if (/^<tabs(?:\s[^>]*)?>\s*$/i.test(trimmedLine)) {
        let closeIdx = -1;
        for (let j = i + 1; j < rawLines.length; j++) {
          if (/^<\/tabs\s*>$/i.test(rawLines[j].trim())) {
            closeIdx = j;
            break;
          }
        }
        if (closeIdx > i) {
          const htmlTabItems = parseHtmlTabs(
            rawLines.slice(i + 1, closeIdx).join("\n"),
          );
          if (htmlTabItems.length) {
            flushMarkdown();
            sections.push({ type: "tabs", items: htmlTabItems });
            i = closeIdx + 1;
            continue;
          }
        }
      }

      // Code tabs: :::tabs ... :::
      if (line.trim() === ":::tabs") {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        const tabCodeLines = collected.content;
        i = collected.next; // skip closing :::

        const tabItems: CodeTabItem[] = [];
        const fullTabContent = tabCodeLines.join("\n");
        const codeBlockRegex = /```(\w+[\w-]*)\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(fullTabContent)) !== null) {
          tabItems.push({
            language: formatTabLabel(match[1]),
            syntax: match[1],
            code: match[2].trim(),
          });
        }
        sections.push({ type: "tabs", items: tabItems });
        continue;
      }

      // Compare container: :::compare ... :::
      if (line.trim() === ":::compare") {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        const compLines = collected.content;
        i = collected.next;

        let inputTitle = "输入";
        let inputText = "";
        let outputTitle = "输出预览";
        let outputText = "";

        const compText = compLines.join("\n");
        const parts = compText.split(/^###\s+/m);
        for (const p of parts) {
          if (!p.trim()) continue;
          const firstLine = p.split("\n")[0].trim();
          const rest = p.split("\n").slice(1).join("\n").trim();
          if (firstLine.includes("输入")) {
            inputTitle = firstLine;
            inputText = rest;
          } else if (firstLine.includes("输出")) {
            outputTitle = firstLine;
            outputText = rest;
          }
        }
        sections.push({
          type: "compare",
          inputTitle,
          inputText,
          outputTitle,
          outputText,
        });
        continue;
      }

      // Navigation cards: :::cards ... :::
      if (line.trim().startsWith(":::cards")) {
        flushMarkdown();
        const colMatch =
          line.match(/(?:cols?|columns?)=(\d+)/i) ||
          line.match(/:::cards\s+(\d+)/);
        const cols = colMatch
          ? Math.max(1, Math.min(4, parseInt(colMatch[1])))
          : 3;
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();
        const items: CardItem[] = [];

        if (text.includes("###")) {
          const parts = text.split(/^###\s+/m);
          for (const p of parts) {
            if (!p.trim()) continue;
            const lines = p.split("\n");
            const header = lines[0].trim();
            const rest = lines.slice(1).join("\n").trim();

            let title = header;
            let href = "";
            let tag = "";
            const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(header);
            if (linkMatch) {
              title = linkMatch[1];
              href = linkMatch[2];
            }

            let description = rest;
            if (!href) {
              const bodyLinkMatch = /\[(.*?)\]\((.*?)\)/.exec(rest);
              if (bodyLinkMatch) {
                href = bodyLinkMatch[2];
                description = rest.replace(bodyLinkMatch[0], "").trim();
              }
            }
            const tagMatch = /(?:标签|tag|badge)[:：]\s*([^\n]+)/i.exec(
              description,
            );
            if (tagMatch) {
              tag = tagMatch[1].trim();
              description = description.replace(tagMatch[0], "").trim();
            }

            items.push({ title, href, description, tag });
          }
        } else {
          for (const rawLine of collected.content) {
            const trimmed = rawLine.trim();
            if (!trimmed.startsWith("-") && !trimmed.startsWith("*")) continue;
            const lineContent = trimmed.replace(/^[-*]\s+/, "");
            const linkMatch = /^\[(.*?)\]\((.*?)\)(?::|\s+)?([\s\S]*)$/.exec(
              lineContent,
            );
            if (linkMatch) {
              items.push({
                title: linkMatch[1].trim(),
                href: linkMatch[2].trim(),
                description: linkMatch[3].trim(),
              });
            } else {
              const colonIdx = lineContent.indexOf(":");
              const colonCnIdx = lineContent.indexOf("：");
              const splitIdx = colonIdx > -1 ? colonIdx : colonCnIdx;
              if (splitIdx > -1) {
                items.push({
                  title: lineContent
                    .slice(0, splitIdx)
                    .replace(/[*_]/g, "")
                    .trim(),
                  description: lineContent.slice(splitIdx + 1).trim(),
                });
              } else {
                items.push({
                  title: lineContent.replace(/[*_]/g, "").trim(),
                  description: "",
                });
              }
            }
          }
        }
        sections.push({ type: "cards", cols, items });
        continue;
      }

      // Feature highlights cards: :::features ... :::
      if (line.trim().startsWith(":::features")) {
        flushMarkdown();
        const colMatch =
          line.match(/(?:cols?|columns?)=(\d+)/i) ||
          line.match(/:::features\s+(\d+)/);
        const cols = colMatch
          ? Math.max(1, Math.min(4, parseInt(colMatch[1])))
          : 3;
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();
        const items: FeatureItem[] = [];

        const parts = text.split(/^###\s+/m);
        for (const p of parts) {
          if (!p.trim()) continue;
          const lines = p.split("\n");
          const title = lines[0].trim();
          const body = lines.slice(1).join("\n").trim();
          const html = marked.parse(replaceInlineIcons(body), { gfm: true }) as string;
          items.push({ title, html: sanitizeMarkup(html) });
        }
        sections.push({ type: "features", cols, items });
        continue;
      }

      // Prompt & preview comparison: :::prompt-preview ... :::
      if (line.trim().startsWith(":::prompt-preview")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();

        let promptTitle = "提示词";
        let promptText = "";
        let previewTitle = "输出预览";
        let previewHtml = "";
        let previewSrc = "";

        const parts = text.split(/^###\s+/m);
        for (const p of parts) {
          if (!p.trim()) continue;
          const lines = p.split("\n");
          const header = lines[0].trim();
          const body = lines.slice(1).join("\n").trim();

          if (/提示|prompt/i.test(header) || !promptText) {
            promptTitle = header || "提示词";
            promptText = body;
          } else {
            previewTitle = header || "输出预览";
            const imgMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(body);
            if (imgMatch) {
              previewSrc = imgMatch[2];
            }
            previewHtml = sanitizeMarkup(
              marked.parse(replaceInlineIcons(body), { gfm: true }) as string,
            );
          }
        }
        sections.push({
          type: "prompt_preview",
          promptTitle,
          promptText,
          previewTitle,
          previewHtml,
          previewSrc,
        });
        continue;
      }

      // Video and media grid: :::video-grid ... :::
      if (line.trim().startsWith(":::video-grid")) {
        flushMarkdown();
        const colMatch =
          line.match(/(?:cols?|columns?)=(\d+)/i) ||
          line.match(/:::video-grid\s+(\d+)/);
        const cols = colMatch
          ? Math.max(1, Math.min(4, parseInt(colMatch[1])))
          : 3;
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const fullContent = collected.content.join("\n");
        const items: MediaGridItem[] = [];

        // Match: [![alt](poster)](video_or_image)
        const linkedImgRegex = /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g;
        let m;
        const handledPositions = new Set<number>();
        while ((m = linkedImgRegex.exec(fullContent)) !== null) {
          items.push({
            title: m[1],
            poster: m[2],
            src: m[3],
            isVideo: true,
          });
          handledPositions.add(m.index);
        }

        // Match: ![alt](src)
        const standaloneImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        while ((m = standaloneImgRegex.exec(fullContent)) !== null) {
          const before = fullContent.slice(Math.max(0, m.index - 1), m.index);
          if (before === "[") continue;
          const src = m[2];
          const isVideo =
            /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(src) ||
            src.includes("video");
          items.push({
            title: m[1],
            src,
            isVideo: isVideo || true,
          });
        }

        // Match HTML <video>
        const videoTagRegex =
          /<video\b[^>]*src=["']([^"']+)["'][^>]*(?:poster=["']([^"']+)["'])?[^>]*>/gi;
        while ((m = videoTagRegex.exec(fullContent)) !== null) {
          items.push({
            src: m[1],
            poster: m[2] || "",
            isVideo: true,
          });
        }

        sections.push({ type: "video_grid", cols, items });
        continue;
      }

      // Multimodal showcase: :::multimodal ... :::
      if (line.trim().startsWith(":::multimodal")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();

        let inputTitle = "输入";
        let inputRaw = "";
        let outputTitle = "输出";
        let outputRaw = "";

        const parts = text.split(/^###\s+/m);
        for (const p of parts) {
          if (!p.trim()) continue;
          const lines = p.split("\n");
          const header = lines[0].trim();
          const rest = lines.slice(1).join("\n").trim();

          if (/输入|input/i.test(header) || !inputRaw) {
            inputTitle = header || "输入";
            inputRaw = rest;
          } else {
            outputTitle = header || "输出";
            outputRaw = rest;
          }
        }

        sections.push({
          type: "multimodal",
          inputTitle,
          inputRaw,
          outputTitle,
          outputRaw,
        });
        continue;
      }

      // Storyboard & script showcase: :::storyboard ... :::
      if (line.trim().startsWith(":::storyboard")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();

        let scriptTitle = "Plain";
        let scriptText = "";
        let mainImageSrc = "";
        let mainImageAlt = "故事板分镜";
        const assets: StoryboardAsset[] = [];

        const parts = text.split(/^###\s+/m);
        for (const p of parts) {
          if (!p.trim()) continue;
          const lines = p.split("\n");
          const header = lines[0].trim();
          const body = lines.slice(1).join("\n").trim();

          if (/脚本|script|plain/i.test(header) || (!scriptText && !body.includes("!["))) {
            if (header && !/脚本|script/i.test(header)) {
              scriptTitle = header;
            }
            scriptText = body;
          } else if (/主预览|预览|主图|storyboard|main/i.test(header)) {
            const imgMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(body);
            if (imgMatch) {
              mainImageAlt = imgMatch[1] || "故事板分镜";
              mainImageSrc = imgMatch[2];
            }
          } else if (/素材|asset|reference/i.test(header)) {
            const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let m;
            while ((m = imgRegex.exec(body)) !== null) {
              assets.push({
                title: m[1],
                src: m[2],
              });
            }
          } else {
            const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            const matches = Array.from(body.matchAll(imgRegex));
            if (!mainImageSrc && matches.length === 1) {
              mainImageAlt = matches[0][1] || "故事板分镜";
              mainImageSrc = matches[0][2];
            } else if (matches.length > 0) {
              for (const m of matches) {
                assets.push({ title: m[1], src: m[2] });
              }
            } else if (!scriptText) {
              scriptText = body;
            }
          }
        }

        sections.push({
          type: "storyboard",
          scriptTitle,
          scriptText,
          mainImageSrc,
          mainImageAlt,
          assets,
        });
        continue;
      }

      // Keyframe sequence gallery: :::keyframes ... :::
      if (line.trim().startsWith(":::keyframes")) {
        flushMarkdown();
        const colMatch =
          line.match(/(?:cols?|columns?)=(\d+)/i) ||
          line.match(/:::keyframes\s+(\d+)/);
        const cols = colMatch
          ? Math.max(1, Math.min(6, parseInt(colMatch[1])))
          : 4;
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;

        let prompt = "";
        const items: KeyframeItem[] = [];

        const lines = collected.content;
        const promptLines: string[] = [];
        for (const l of lines) {
          const trimmed = l.trim();
          if (trimmed.startsWith(">")) {
            promptLines.push(
              trimmed
                .replace(/^>\s?/, "")
                .replace(/^(?:示例|example)[:：]\s*/i, ""),
            );
          } else if (trimmed.startsWith("示例:") || trimmed.startsWith("示例：")) {
            promptLines.push(trimmed.replace(/^(?:示例|example)[:：]\s*/i, ""));
          } else {
            const imgMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(trimmed);
            if (imgMatch) {
              items.push({
                title: imgMatch[1],
                src: imgMatch[2],
              });
            }
          }
        }
        if (promptLines.length > 0) {
          prompt = promptLines.join("\n").trim();
        }

        sections.push({
          type: "keyframes",
          prompt,
          cols,
          items,
        });
        continue;
      }

      // File attachment card: :::file ... ::: or :::file [name](url) size
      if (line.trim().startsWith(":::file")) {
        flushMarkdown();
        const inlineMatch = /:::file\s+\[(.*?)\]\((.*?)\)(?:\s+([^\n]+))?/.exec(
          line.trim(),
        );
        if (inlineMatch && inlineMatch[2]) {
          sections.push({
            type: "file",
            name:
              inlineMatch[1] ||
              inlineMatch[2].split("/").pop() ||
              "附件文件",
            url: inlineMatch[2],
            size: inlineMatch[3]?.trim(),
          });
          i++;
          if (i < rawLines.length && rawLines[i].trim() === ":::") {
            i++;
          }
          continue;
        }

        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();

        let name = "附件文件";
        let url = "#";
        let size = "";

        const linkMatch = /\[(.*?)\]\((.*?)\)(?:\s+([^\n]+))?/.exec(text);
        if (linkMatch) {
          name = linkMatch[1] || linkMatch[2].split("/").pop() || "附件文件";
          url = linkMatch[2];
          size = linkMatch[3]?.trim() || "";
        } else {
          const n = /name[:：]\s*([^\n]+)/i.exec(text);
          const u = /url[:：]\s*([^\n]+)/i.exec(text);
          const s = /size[:：]\s*([^\n]+)/i.exec(text);
          if (n) name = n[1].trim();
          if (u) url = u[1].trim();
          if (s) size = s[1].trim();
        }

        sections.push({
          type: "file",
          name,
          url,
          size,
        });
        continue;
      }

      // Banner cards / Model cards: :::banner-cards ... :::
      if (
        line.trim().startsWith(":::banner-cards") ||
        line.trim().startsWith(":::model-cards")
      ) {
        flushMarkdown();
        const colMatch =
          line.match(/(?:cols?|columns?)=(\d+)/i) ||
          line.match(/:::(?:banner|model)-cards\s+(\d+)/);
        const cols = colMatch
          ? Math.max(1, Math.min(4, parseInt(colMatch[1])))
          : 3;
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();
        const items: BannerCardItem[] = [];

        if (text.includes("###")) {
          const parts = text.split(/^###\s+/m);
          for (const p of parts) {
            if (!p.trim()) continue;
            const lines = p
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            const header = lines[0];

            let title = header;
            let href = "";
            const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(header);
            if (linkMatch) {
              title = linkMatch[1];
              href = linkMatch[2];
            }

            let image = "";
            let subtitle = "";
            let description = "";
            const textLines: string[] = [];

            for (let j = 1; j < lines.length; j++) {
              const cur = lines[j];
              const imgMatch = /!\[(.*?)\]\((.*?)\)/.exec(cur);
              const linkFieldMatch = /(?:链接|url|href|link)[:：]\s*([^\n]+)/i.exec(cur);
              const subFieldMatch = /(?:副标|副标题|subtitle|tagline)[:：]\s*([^\n]+)/i.exec(cur);
              const descFieldMatch = /(?:说明|描述|desc|description)[:：]\s*([^\n]+)/i.exec(cur);

              if (imgMatch && !image) {
                image = imgMatch[2];
              } else if (linkFieldMatch) {
                const rawL = linkFieldMatch[1].trim();
                const mdL = /\[.*?\]\((.*?)\)/.exec(rawL);
                href = mdL ? mdL[1].trim() : rawL.replace(/^[<"']|[>"']$/g, "").trim();
              } else if (subFieldMatch) {
                subtitle = subFieldMatch[1].trim();
              } else if (descFieldMatch) {
                description = descFieldMatch[1].trim();
              } else {
                textLines.push(cur);
              }
            }

            if (!subtitle && textLines.length > 0) {
              subtitle = textLines[0];
            }
            if (!description && textLines.length > 1) {
              description = textLines.slice(1).join(" ");
            }

            if (!image) {
              image =
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
            }

            items.push({
              title,
              href,
              image,
              subtitle,
              description,
            });
          }
        } else {
          // Parse list items: - 标题: ... \n 链接: ... \n 图片: ... \n 副标: ... \n 说明: ...
          const rawItems = text.split(/(?:^|\n)-\s+/).filter(Boolean);
          for (const rawItem of rawItems) {
            let title = "";
            let href = "";
            let image = "";
            let subtitle = "";
            let description = "";

            const titleMatch = /(?:标题|title|name)[:：]\s*([^\n]+)/i.exec(rawItem);
            const linkMatch = /(?:链接|url|href|link)[:：]\s*([^\n]+)/i.exec(rawItem);
            const imageMatch = /(?:图片|image|img|banner|封面)[:：]\s*([^\n]+)/i.exec(rawItem);
            const subMatch = /(?:副标|副标题|subtitle|tagline)[:：]\s*([^\n]+)/i.exec(rawItem);
            const descMatch = /(?:说明|描述|desc|description)[:：]\s*([^\n]+)/i.exec(rawItem);

            if (linkMatch) {
              const rawL = linkMatch[1].trim();
              const mdL = /\[.*?\]\((.*?)\)/.exec(rawL);
              href = mdL ? mdL[1].trim() : rawL.replace(/^[<"']|[>"']$/g, "").trim();
            }

            if (titleMatch) {
              const rawT = titleMatch[1].trim();
              const mdT = /\[(.*?)\]\((.*?)\)/.exec(rawT);
              if (mdT) {
                title = mdT[1].trim();
                if (!href) href = mdT[2].trim();
              } else {
                title = rawT;
              }
            }

            if (imageMatch) {
              const rawI = imageMatch[1].trim();
              const mdI = /!\[.*?\]\((.*?)\)/.exec(rawI);
              image = mdI ? mdI[1].trim() : rawI;
            }

            if (subMatch) subtitle = subMatch[1].trim();
            if (descMatch) description = descMatch[1].trim();

            if (!image) {
              image =
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
            }

            if (title) {
              items.push({ title, href, image, subtitle, description });
            }
          }
        }
        sections.push({ type: "banner_cards", cols, items });
        continue;
      }

      // Capability matrix: :::capabilities ... :::
      if (line.trim().startsWith(":::capabilities")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const text = collected.content.join("\n").trim();

        let title = "";
        let description = "";
        const items: CapabilityItem[] = [];

        // Check for section title / desc: ## Title \n Description
        const headerMatch = /^(?:##\s+([^\n]+))(?:\n+([^-\n#][^\n]*))?/m.exec(
          text,
        );
        if (headerMatch) {
          title = headerMatch[1]?.trim() || "";
          description = headerMatch[2]?.trim() || "";
        }

        // Support heading format: ### 标题
        if (text.includes("###")) {
          const parts = text.split(/^###\s+/m);
          for (const p of parts) {
            if (!p.trim()) continue;
            const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
            const header = lines[0];
            let itemTitle = header;
            let href = "";
            let icon = "";
            let itemDesc = "";

            const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(header);
            if (linkMatch) {
              itemTitle = linkMatch[1];
              href = linkMatch[2];
            }

            for (let j = 1; j < lines.length; j++) {
              const cur = lines[j];
              const im = /(?:图标|icon|image|img)[:：]\s*([^\n]+)/i.exec(cur);
              const lm = /(?:链接|url|href|link)[:：]\s*([^\n]+)/i.exec(cur);
              const dm = /(?:说明|描述|desc|description)[:：]\s*([^\n]+)/i.exec(cur);
              if (im) icon = im[1].trim();
              if (lm) {
                const rawL = lm[1].trim();
                const mdL = /\[.*?\]\((.*?)\)/.exec(rawL);
                href = mdL ? mdL[1].trim() : rawL.replace(/^[<"']|[>"']$/g, "").trim();
              }
              if (dm) itemDesc = dm[1].trim();
              else if (!im && !lm && !itemDesc) itemDesc = cur;
            }

            if (itemTitle) {
              items.push({ icon, title: itemTitle, href, description: itemDesc });
            }
          }
        } else {
          // Parse list items (- ...)
          const rawItems = text.split(/(?:^|\n)-\s+/).filter(Boolean);
          for (const rawItem of rawItems) {
            if (rawItem.startsWith("##")) continue;
            let icon = "";
            let itemTitle = "";
            let href = "";
            let itemDesc = "";

            const iconMatch = /(?:图标|icon|image|img)[:：]\s*([^\n]+)/i.exec(rawItem);
            const titleMatch = /(?:标题|title|name)[:：]\s*([^\n]+)/i.exec(rawItem);
            const linkMatchExplicit = /(?:链接|url|href|link)[:：]\s*([^\n]+)/i.exec(rawItem);
            const descMatch =
              /(?:说明|描述|desc|description)[:：]\s*([^\n]+)/i.exec(rawItem);

            if (iconMatch) icon = iconMatch[1].trim();
            if (descMatch) itemDesc = descMatch[1].trim();

            if (linkMatchExplicit) {
              const rawL = linkMatchExplicit[1].trim();
              const mdL = /\[.*?\]\((.*?)\)/.exec(rawL);
              href = mdL ? mdL[1].trim() : rawL.replace(/^[<"']|[>"']$/g, "").trim();
            }

            if (titleMatch) {
              const rawT = titleMatch[1].trim();
              const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(rawT);
              if (linkMatch) {
                itemTitle = linkMatch[1];
                if (!href) href = linkMatch[2];
              } else {
                itemTitle = rawT;
              }
            } else {
              // Support inline format: [标题](/docs/xxx): 说明
              const inlineMatch = /^(?:\[(.*?)\]\((.*?)\)|([^\n:]+))[:：]?\s*(.*)$/.exec(rawItem.trim());
              if (inlineMatch && inlineMatch[1]) {
                itemTitle = inlineMatch[1];
                if (!href) href = inlineMatch[2];
                if (!itemDesc && inlineMatch[4]) itemDesc = inlineMatch[4];
              }
            }

            if (itemTitle) {
              items.push({
                icon,
                title: itemTitle,
                href,
                description: itemDesc,
              });
            }
          }
        }

        sections.push({
          type: "capabilities",
          title,
          description,
          items,
        });
        continue;
      }

      // Pro Table: :::pro-table ... :::
      if (line.trim().startsWith(":::pro-table")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;
        const tableLines = collected.content
          .map((l) => l.trim())
          .filter((l) => l.startsWith("|"));

        const headers: string[] = [];
        const rows: string[][] = [];
        const aligns: ("left" | "center" | "right")[] = [];

        if (tableLines.length >= 2) {
          // Header row
          const rawHeaders = tableLines[0]
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
          headers.push(...rawHeaders);

          // Align row: | :--- | :---: | ---: |
          const rawAligns = tableLines[1]
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

          for (const a of rawAligns) {
            if (a.startsWith(":") && a.endsWith(":")) aligns.push("center");
            else if (a.endsWith(":")) aligns.push("right");
            else aligns.push("left");
          }

          // Data rows
          for (let r = 2; r < tableLines.length; r++) {
            const cells = tableLines[r]
              .split("|")
              .map((c) => c.trim())
              .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (cells.length > 0) {
              rows.push(cells);
            }
          }
        }

        sections.push({
          type: "pro_table",
          headers,
          rows,
          aligns,
        });
        continue;
      }

      // API Explorer Card: :::api-explorer ... :::
      if (line.trim().startsWith(":::api-explorer")) {
        flushMarkdown();
        const headerRest = line.trim().replace(/^:::api-explorer\s*/, "").trim();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;

        let title = "API Explorer";
        let description =
          "您可以通过 API Explorer 在线发起调用，无需关注签名生成过程，快速获取调用结果。";
        let buttonText = "去调试";
        let href = headerRest || "https://example.com/请替换为API调试地址";

        const descLines: string[] = [];

        for (const rawL of collected.content) {
          const l = rawL.trim();
          if (!l) continue;

          // Heading: ### API Explorer
          const headingMatch = /^#{1,6}\s+(.+)$/.exec(l);
          if (headingMatch) {
            title = headingMatch[1].trim();
            continue;
          }

          // Key-value lines: 标题: / 说明: / 按钮: / 链接:
          const kvTitle = /^(?:标题|title)\s*[:：]\s*(.+)$/i.exec(l);
          if (kvTitle) {
            title = kvTitle[1].trim();
            continue;
          }
          const kvDesc = /^(?:说明|描述|description|desc)\s*[:：]\s*(.+)$/i.exec(l);
          if (kvDesc) {
            descLines.push(kvDesc[1].trim());
            continue;
          }
          const kvBtn = /^(?:按钮|button)\s*[:：]\s*(.+)$/i.exec(l);
          if (kvBtn) {
            buttonText = kvBtn[1].trim();
            continue;
          }
          const kvHref = /^(?:链接|地址|url|href|link)\s*[:：]\s*(.+)$/i.exec(l);
          if (kvHref) {
            href = kvHref[1].trim();
            continue;
          }

          // Standalone Markdown link: [去调试](https://...)
          const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(l);
          if (linkMatch) {
            buttonText = linkMatch[1].trim() || buttonText;
            href = linkMatch[2].trim() || href;
            continue;
          }

          descLines.push(l);
        }

        if (descLines.length > 0) {
          description = descLines.join(" ");
        }

        sections.push({
          type: "api_explorer",
          title,
          description,
          buttonText,
          href,
        });
        continue;
      }

      // API Parameters Accordion List: :::api-params ... :::
      if (line.trim().startsWith(":::api-params")) {
        flushMarkdown();
        i++;
        const collected = readContainer(rawLines, i);
        i = collected.next;

        let title = "";
        let subtitle = "";
        const items: ApiParamItem[] = [];

        // Check if a line starts a new top-level parameter item
        const isParamStart = (cur: string, next?: string) => {
          const t = cur.trim();
          if (!t.startsWith("-") && !t.startsWith("*")) return false;
          const r = t.replace(/^[-*]\s*/, "");
          if (/^(?:参数|名称|name)\s*[:：]/i.test(r)) return true;
          if (r.includes("|")) return true;
          if (next) {
            const nt = next.trim();
            if (
              /^(?:类型|type|必填|必选|required|简述|summary|标签|badge|说明|desc|description)\s*[:：]/i.test(
                nt
              )
            ) {
              return true;
            }
          }
          return false;
        };

        // Chunk lines into individual parameter items (tracking fences & sub-containers)
        let fence = "";
        let containerDepth = 0;
        let currentItemLines: string[] | null = null;
        const itemChunks: string[][] = [];

        for (let lineIdx = 0; lineIdx < collected.content.length; lineIdx++) {
          const curLine = collected.content[lineIdx];
          const trimmed = curLine.trim();

          const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(curLine);
          if (fenceMatch) {
            if (!fence) fence = fenceMatch[1];
            else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
              fence = "";
            }
          }

          if (!fence) {
            if (/^:::\w/.test(trimmed)) containerDepth++;
            else if (trimmed === ":::") {
              if (containerDepth > 0) containerDepth--;
            }
          }

          if (!fence && containerDepth === 0) {
            if (!currentItemLines) {
              if (trimmed.startsWith("### ")) {
                subtitle = trimmed.replace(/^###\s+/, "").trim();
                continue;
              } else if (/^#{1,2}\s+/.test(trimmed)) {
                title = trimmed.replace(/^#{1,2}\s+/, "").trim();
                continue;
              }
            }

            const nextLine = collected.content[lineIdx + 1];
            if (isParamStart(curLine, nextLine)) {
              if (currentItemLines && currentItemLines.length > 0) {
                itemChunks.push(currentItemLines);
              }
              currentItemLines = [curLine];
              continue;
            }
          }

          if (currentItemLines) {
            currentItemLines.push(curLine);
          }
        }

        if (currentItemLines && currentItemLines.length > 0) {
          itemChunks.push(currentItemLines);
        }

        // Parse each parameter item chunk
        for (const chunk of itemChunks) {
          if (chunk.length === 0) continue;
          const startLine = chunk[0].replace(/^[-*]\s*/, "").trim();

          let name = "";
          let type = "";
          let required = "";
          let badge = "";
          let summary = "";
          let defaultOpen: boolean | undefined = undefined;

          // Check shorthand pipe syntax on first line: - model | string | 必选 | 模型 ID
          if (startLine.includes("|") && !/^(?:参数|名称|name)\s*[:：]/i.test(startLine)) {
            const parts = startLine.split("|").map((p) => p.trim());
            name = parts[0] || "";
            type = parts[1] || "";
            required = parts[2] || "";
            summary = parts[3] || "";
          } else {
            const mName = /^(?:参数|名称|name)\s*[:：]\s*(.+)$/i.exec(startLine);
            if (mName) {
              name = mName[1].trim();
            } else {
              name = startLine;
            }
          }

          let chunkFence = "";
          let chunkContainerDepth = 0;
          let inDesc = false;
          let inlineFirstDesc: string | null = null;
          const descBodyLines: string[] = [];

          for (let lIdx = 1; lIdx < chunk.length; lIdx++) {
            const line = chunk[lIdx];
            const trimmed = line.trim();

            const fMatch = /^\s*(`{3,}|~{3,})/.exec(line);
            if (fMatch) {
              if (!chunkFence) chunkFence = fMatch[1];
              else if (fMatch[1][0] === chunkFence[0] && fMatch[1].length >= chunkFence.length) {
                chunkFence = "";
              }
            }

            if (!chunkFence) {
              if (/^:::\w/.test(trimmed)) chunkContainerDepth++;
              else if (trimmed === ":::") {
                if (chunkContainerDepth > 0) chunkContainerDepth--;
              }
            }

            // Lines inside code fences or sub-containers are strictly description content
            if (chunkFence || chunkContainerDepth > 0) {
              inDesc = true;
              descBodyLines.push(line);
              continue;
            }

            if (!inDesc) {
              if (!trimmed) continue;

              const mType = /^(?:类型|type)\s*[:：]\s*(.+)$/i.exec(trimmed);
              if (mType) {
                type = mType[1].trim();
                continue;
              }
              const mReq = /^(?:必填|必选|默认值|状态|required|default)\s*[:：]\s*(.+)$/i.exec(trimmed);
              if (mReq) {
                required = mReq[1].trim();
                continue;
              }
              const mBadge = /^(?:标签|角标|badge|tag)\s*[:：]\s*(.+)$/i.exec(trimmed);
              if (mBadge) {
                badge = mBadge[1].trim();
                continue;
              }
              const mSum = /^(?:简述|摘要|简称|summary)\s*[:：]\s*(.+)$/i.exec(trimmed);
              if (mSum) {
                summary = mSum[1].trim();
                continue;
              }
              const mOpen = /^(?:展开|默认展开|open)\s*[:：]\s*(.+)$/i.exec(trimmed);
              if (mOpen) {
                const v = mOpen[1].trim().toLowerCase();
                defaultOpen = v === "true" || v === "是" || v === "1" || v === "yes";
                continue;
              }
              const mDesc = /^(?:说明|描述|详情|description|desc)\s*[:：]\s*(.*)$/i.exec(trimmed);
              if (mDesc) {
                inDesc = true;
                const rest = mDesc[1].trim();
                if (rest && rest !== "|") {
                  inlineFirstDesc = rest;
                }
                continue;
              }

              // First non-metadata line marks the beginning of description
              inDesc = true;
              descBodyLines.push(line);
              continue;
            }

            // In description mode: handle additional paragraphs labeled 补充:/说明:
            const mExtra = /^(?:补充|注意|说明|描述|详情)\s*[:：]\s*(.*)$/i.exec(trimmed);
            if (mExtra) {
              const rest = mExtra[1].trim();
              if (rest) {
                if (descBodyLines.length > 0 || inlineFirstDesc) {
                  descBodyLines.push("");
                }
                descBodyLines.push(rest);
              }
              continue;
            }

            descBodyLines.push(line);
          }

          // Dedent description lines and normalize structure
          const dedentedBody = dedentLines(descBodyLines);
          const combinedLines = inlineFirstDesc
            ? [inlineFirstDesc, ...dedentedBody]
            : dedentedBody;
          const descriptionRaw = combinedLines.join("\n").trim();

          let descriptionHtml = "";
          if (descriptionRaw) {
            descriptionHtml = sanitizeMarkup(
              marked.parse(replaceInlineIcons(descriptionRaw), { gfm: true }) as string
            );
          }

          if (name) {
            items.push({
              name,
              type: type || undefined,
              required: required || undefined,
              badge: badge || undefined,
              summary: summary || undefined,
              defaultOpen,
              descriptionRaw: descriptionRaw || undefined,
              descriptionHtml: descriptionHtml || undefined,
            });
          }
        }

        sections.push({
          type: "api_params",
          title: title || undefined,
          subtitle: subtitle || undefined,
          items,
        });
        continue;
      }

      // Details / Collapsible Accordion: :::details 标题 ... :::
      if (line.trim().startsWith(":::details")) {
        flushMarkdown();
        const title =
          line.trim().replace(/^:::details\s*/, "") || "点击查看详情";
        i++;
        const detailLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim() !== ":::") {
          detailLines.push(rawLines[i]);
          i++;
        }
        i++;
        const detailHtml = marked.parse(replaceInlineIcons(detailLines.join("\n")), {
          gfm: true,
        }) as string;
        sections.push({
          type: "details",
          title,
          html: sanitizeMarkup(detailHtml),
        });
        continue;
      }

      // GitHub Callouts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION] / [!DANGER]
      if (line.trim().startsWith("> [!")) {
        flushMarkdown();
        const calloutMatch = line
          .trim()
          .match(/> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\](.*)/i);
        const rawType = (calloutMatch ? calloutMatch[1] : "NOTE").toUpperCase();
        const customTitle = calloutMatch && calloutMatch[2]?.trim();

        let level: "note" | "tip" | "important" | "warning" | "danger" = "note";
        let title = customTitle || "说明";

        if (rawType === "TIP") {
          level = "tip";
          title = customTitle || "技巧与建议";
        } else if (rawType === "IMPORTANT") {
          level = "important";
          title = customTitle || "重要须知";
        } else if (rawType === "WARNING") {
          level = "warning";
          title = customTitle || "注意事项";
        } else if (rawType === "CAUTION" || rawType === "DANGER") {
          level = "danger";
          title = customTitle || "高危警示";
        }

        i++;
        const contentLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
          contentLines.push(rawLines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        sections.push({
          type: "callout",
          level,
          title,
          content: contentLines.join("\n"),
        });
        continue;
      }

      currentMarkdownBuffer.push(line);
      i++;
    }

    flushMarkdown();
    return sections;
  }, [content]);

  return (
    <div
      ref={root}
      onClick={(event) => {
        if (event.target instanceof HTMLImageElement) {
          event.stopPropagation();
          setZoom(event.target.src);
        }
      }}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLImageElement &&
          ["Enter", " "].includes(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          setZoom(event.target.src);
        }
      }}
      className={`doc-markdown theme-${appearance.theme} density-${appearance.density} space-y-6 text-gray-800 text-sm leading-relaxed`}
    >
      <Image.Preview
        src={zoom}
        visible={!!zoom}
        className="doc-image-preview"
        maskClosable={true}
        onVisibleChange={(visible) => {
          if (!visible) setZoom("");
        }}
      />
      {parsedSections.map((sec, idx) => {
        if (sec.type === "tabs") {
          return <CodeTabs key={idx} items={sec.items} />;
        }

        if (sec.type === "mermaid") {
          return <MermaidChart key={idx} code={sec.code} />;
        }

        if (sec.type === "math_block") {
          let mathHtml = "";
          try {
            mathHtml = katex.renderToString(sec.formula, {
              throwOnError: false,
              displayMode: true,
            });
          } catch {
            mathHtml = "<p>公式暂时无法渲染</p>";
          }
          return (
            <div
              key={idx}
              className="my-5 p-4 bg-gray-50/70 border border-gray-200 rounded-xl overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        }

        if (sec.type === "details") {
          return (
            <details
              key={idx}
              className="my-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm group"
            >
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-50/80 font-medium text-xs text-gray-800 cursor-pointer hover:bg-blue-50/50 transition-colors select-none">
                <span>{sec.title}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div
                className="p-4 border-t border-gray-100 text-xs text-gray-600 prose-clean leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sec.html }}
              />
            </details>
          );
        }

        if (sec.type === "styled") {
          const customStyle = safeComponentStyle(sec.style);
          const sanitizedClass = sec.className.replace(/[^a-zA-Z0-9_ -]/g, "").trim();
          return (
            <div
              key={idx}
              className={`doc-styled-container my-4 ${sanitizedClass}`}
              style={{
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#f8f9fc",
                border: "1px solid #e5e8ef",
                ...customStyle,
              }}
            >
              <MarkdownRenderer content={sec.content} appearance={appearance} />
            </div>
          );
        }
        if (sec.type === "compare") {
          return (
            <div
              key={idx}
              className="doc-comparison my-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                  <span>{sec.inputTitle}</span>
                  <span className="text-[11px] text-gray-400 font-normal">
                    请求内容
                  </span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-md text-xs text-gray-700 font-mono whitespace-pre-wrap">
                  <MarkdownRenderer
                    content={sec.inputText}
                    appearance={appearance}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                  <span>{sec.outputTitle}</span>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    模型响应
                  </span>
                </div>
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3.5 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
                  <MarkdownRenderer
                    content={sec.outputText}
                    appearance={appearance}
                  />
                </div>
              </div>
            </div>
          );
        }

        if (sec.type === "cards") {
          return <DocCards key={idx} cols={sec.cols} items={sec.items} />;
        }

        if (sec.type === "features") {
          return <DocFeatures key={idx} cols={sec.cols} items={sec.items} />;
        }

        if (sec.type === "prompt_preview") {
          return (
            <DocPromptPreview
              key={idx}
              promptTitle={sec.promptTitle}
              promptText={sec.promptText}
              previewTitle={sec.previewTitle}
              previewHtml={sec.previewHtml}
              previewSrc={sec.previewSrc}
              onZoom={(src) => setZoom(src)}
            />
          );
        }

        if (sec.type === "video_grid") {
          return (
            <DocVideoGrid
              key={idx}
              cols={sec.cols}
              items={sec.items}
              onZoom={(src) => setZoom(src)}
            />
          );
        }

        if (sec.type === "multimodal") {
          return (
            <DocMultimodal
              key={idx}
              inputTitle={sec.inputTitle}
              inputNode={
                <MarkdownRenderer
                  content={sec.inputRaw}
                  appearance={appearance}
                />
              }
              outputTitle={sec.outputTitle}
              outputNode={
                <MarkdownRenderer
                  content={sec.outputRaw}
                  appearance={appearance}
                />
              }
            />
          );
        }

        if (sec.type === "storyboard") {
          return (
            <DocStoryboard
              key={idx}
              scriptTitle={sec.scriptTitle}
              scriptText={sec.scriptText}
              mainImageSrc={sec.mainImageSrc}
              mainImageAlt={sec.mainImageAlt}
              assets={sec.assets}
              onZoom={(src) => setZoom(src)}
            />
          );
        }

        if (sec.type === "keyframes") {
          return (
            <DocKeyframes
              key={idx}
              prompt={sec.prompt}
              cols={sec.cols}
              items={sec.items}
              onZoom={(src) => setZoom(src)}
            />
          );
        }

        if (sec.type === "file") {
          return (
            <DocFileAttachment
              key={idx}
              name={sec.name}
              url={sec.url}
              size={sec.size}
            />
          );
        }

        if (sec.type === "banner_cards") {
          return (
            <DocBannerCards
              key={idx}
              cols={sec.cols}
              items={sec.items}
            />
          );
        }

        if (sec.type === "capabilities") {
          return (
            <DocCapabilities
              key={idx}
              title={sec.title}
              description={sec.description}
              items={sec.items}
            />
          );
        }

        if (sec.type === "pro_table") {
          return (
            <DocProTable
              key={idx}
              headers={sec.headers}
              rows={sec.rows}
              aligns={sec.aligns}
            />
          );
        }

        if (sec.type === "api_explorer") {
          return (
            <DocApiExplorer
              key={idx}
              title={sec.title}
              description={sec.description}
              buttonText={sec.buttonText}
              href={sec.href}
            />
          );
        }

        if (sec.type === "api_params") {
          return (
            <DocApiParams
              key={idx}
              title={sec.title}
              subtitle={sec.subtitle}
              items={sec.items.map((item) => ({
                ...item,
                descriptionNode:
                  item.descriptionNode ||
                  (item.descriptionRaw ? (
                    <MarkdownRenderer
                      content={item.descriptionRaw}
                      appearance={appearance}
                    />
                  ) : undefined),
              }))}
            />
          );
        }

        if (sec.type === "callout") {
          let styleClass = "bg-[#F4F7FF] border-[#D0DEFF] text-[#1E429F]";
          let IconComponent = Info;
          let iconColor = "text-blue-600";

          if (sec.level === "tip") {
            styleClass = "bg-emerald-50 border-emerald-200 text-emerald-900";
            IconComponent = CheckCircle2;
            iconColor = "text-emerald-600";
          } else if (sec.level === "important") {
            styleClass = "bg-purple-50 border-purple-200 text-purple-900";
            IconComponent = Sparkles;
            iconColor = "text-purple-600";
          } else if (sec.level === "warning") {
            styleClass = "bg-amber-50 border-amber-200 text-amber-900";
            IconComponent = AlertTriangle;
            iconColor = "text-amber-600";
          } else if (sec.level === "danger") {
            styleClass = "bg-rose-50 border-rose-200 text-rose-900";
            IconComponent = AlertCircle;
            iconColor = "text-rose-600";
          }

          return (
            <div
              key={idx}
              className={`doc-callout doc-callout-${sec.level} p-4 rounded-xl my-5 text-xs leading-relaxed flex items-start gap-3 border shadow-sm ${styleClass}`}
            >
              <IconComponent
                className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`}
              />
              <div>
                <span className="font-semibold mr-1.5">{sec.title}：</span>
                <div
                  className="prose-clean"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeMarkup(
                      marked.parse(replaceInlineIcons(sec.content), { gfm: true }) as string,
                    ),
                  }}
                />
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="prose-clean"
            dangerouslySetInnerHTML={{ __html: sec.html }}
          />
        );
      })}
    </div>
  );
}
