"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import hljs from "highlight.js";
import { CodeTabItem } from "@/lib/dataStore";
import { writeClipboard } from "@/lib/clipboard";
import {
  getHighlightLang,
  splitHighlightedHtmlLines,
} from "@/lib/codeHighlight";

interface CodeTabsProps {
  items: CodeTabItem[];
}

export default function CodeTabs({ items }: CodeTabsProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const currentTab = items[activeIdx] ||
    items[0] || { code: "", syntax: "", language: "" };

  const handleCopy = async () => {
    // http 部署下 navigator.clipboard 不存在，统一走兼容实现
    const ok = await writeClipboard(currentTab.code);
    if (ok) {
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  // Map subheader label (e.g. "Bash", "Python", "Go")
  const displayLangLabel = useMemo(() => {
    const raw = (currentTab.syntax || currentTab.language || "").toLowerCase();
    if (raw === "curl" || raw === "bash" || raw === "sh") return "Bash";
    if (raw === "python" || raw === "py") return "Python";
    if (raw === "go" || raw === "golang") return "Go";
    if (raw === "java") return "Java";
    if (raw === "openai-sdk" || raw === "javascript" || raw === "js")
      return "JavaScript";
    if (raw === "typescript" || raw === "ts") return "TypeScript";
    if (raw === "json") return "JSON";
    return currentTab.language || "Code";
  }, [currentTab]);

  // Syntax highlight code using highlight.js with custom colorization
  const { splitLines, lineCount } = useMemo(() => {
    const rawCode = currentTab.code || "";
    const cleanCode = rawCode.endsWith("\n") ? rawCode.slice(0, -1) : rawCode;
    const lines = cleanCode ? cleanCode.split("\n") : [""];

    const lang = (
      currentTab.syntax ||
      currentTab.language ||
      "plaintext"
    ).toLowerCase();
    const validLang = getHighlightLang(lang);

    let highlightedHtml = "";
    try {
      highlightedHtml = hljs.highlight(cleanCode, {
        language: validLang,
        ignoreIllegals: true,
      }).value;
    } catch {
      highlightedHtml = cleanCode
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    return {
      splitLines: splitHighlightedHtmlLines(highlightedHtml),
      lineCount: lines.length,
    };
  }, [currentTab]);

  if (!items.length) return null;
  return (
    <div className="code-tabs my-6">
      {/* 1. Top Language Selection Tabs: Flush on top of the outer nesting box (1:1 with Screenshot) */}
      <div className="flex items-end gap-2 relative z-10 -mb-px overflow-x-auto">
        {items.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={`${tab.language}-${idx}`}
              onClick={() => setActiveIdx(idx)}
              type="button"
              className={`h-9 px-5 text-[13px] rounded-t-[4px] select-none transition-colors cursor-pointer box-border flex items-center justify-center shrink-0 ${
                isActive
                  ? "border-t-2 border-t-[#1664ff] border-l border-r border-b border-[#e5e6eb] bg-white text-[#1664ff] font-medium"
                  : "border border-[#e5e6eb] bg-[#f7f8fa] text-[#4e5969] hover:bg-[#e5e6eb] hover:text-[#1d2129] font-normal"
              }`}
            >
              {tab.language}
            </button>
          );
        })}
      </div>

      {/* 2. Outer Nesting Box (1:1 with Reference Screenshot) */}
      <div className="rounded-b-xl rounded-tr-xl border border-[#e5e6eb] bg-white p-3 md:p-3.5 shadow-none">
        {/* 3. Inner Code Box Container */}
        <div className="rounded-lg border border-[#e5e6eb] bg-white shadow-none p-5 md:p-6 overflow-hidden">
          {/* Subheader inside the box: Language label on left, Copy button on right */}
          <div className="flex items-center justify-between pb-3 text-xs text-[#86909c]">
            <span className="font-mono text-[#86909c] text-xs font-normal">
              {displayLangLabel}
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-[#4e5969] hover:text-[#1d2129] transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
              title="复制代码"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600 font-medium">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#86909c]" />
                  <span>{copyError ? "复制失败" : "复制"}</span>
                </>
              )}
            </button>
          </div>

          {/* Code Content Area: Line Numbers + Highlighted Text */}
          <div className="font-mono text-xs leading-6 overflow-hidden relative">
            <pre className="m-0 p-0 bg-transparent text-[#1d2129] font-mono leading-6 w-full">
              <code
                className="block font-mono text-xs leading-6 hljs-light bg-transparent w-full"
                style={{ backgroundColor: "transparent" }}
              >
                {splitLines.map((lineHtml, i) => (
                  <div
                    key={i}
                    className="doc-code-line flex items-start min-h-[1.5rem]"
                  >
                    <span
                      aria-hidden="true"
                      className={`doc-code-linenumber select-none pr-4 text-right text-[#86909c] shrink-0 font-mono text-xs ${
                        lineCount >= 1000
                          ? "w-12"
                          : lineCount >= 100
                            ? "w-10"
                            : "w-8"
                      } sticky left-0 bg-white z-10 font-medium leading-6`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="doc-code-linecontent flex-1 min-w-0 font-mono text-xs leading-6 text-[#1d2129] whitespace-pre-wrap break-all"
                      dangerouslySetInnerHTML={{ __html: lineHtml || "<br/>" }}
                    />
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
