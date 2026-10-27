"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { CodeTabItem } from "@/lib/dataStore";
import { writeClipboard } from "@/lib/clipboard";
import {
  hljs,
  getHighlightLang,
  formatDisplayLang,
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

  // 代码区头部始终显示真实语言（如 PowerShell），Tab 标签可能被自定义成
  // macOS / Windows_CMD 这类运行环境名。
  const displayLangLabel = useMemo(
    () => formatDisplayLang(currentTab.syntax || currentTab.language || ""),
    [currentTab],
  );

  // Syntax highlight code using highlight.js with custom colorization
  const { splitLines } = useMemo(() => {
    const rawCode = currentTab.code || "";
    const cleanCode = rawCode.endsWith("\n") ? rawCode.slice(0, -1) : rawCode;

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
    };
  }, [currentTab]);

  if (!items.length) return null;
  return (
    <div className="code-tabs">
      {/* 1. 语言切换 Tab：贴住代码框顶部（对齐火山文档） */}
      <div className="code-tabs-tabs">
        {items.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={`${tab.language}-${idx}`}
              onClick={() => setActiveIdx(idx)}
              type="button"
              className={`code-tabs-tab${isActive ? " is-active" : ""}`}
            >
              {tab.language}
            </button>
          );
        })}
      </div>

      {/* 2. 代码容器：浅灰头部 + 代码区（单层容器，与单代码块一致） */}
      <div className="doc-code-box">
        <div className="doc-code-header">
          <span className="doc-code-lang">{displayLangLabel}</span>
          <button
            onClick={handleCopy}
            className="doc-code-copy-btn"
            title="复制代码"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="copy-text text-green-600">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="copy-text">
                  {copyError ? "复制失败" : "复制"}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="doc-code-body">
          <pre className="doc-code-pre">
            <code className="doc-code hljs-light" style={{ background: "transparent" }}>
              {splitLines.map((lineHtml, i) => (
                <div key={i} className="doc-code-line">
                  <span aria-hidden="true" className="doc-code-linenumber">
                    {i + 1}
                  </span>
                  <span
                    className="doc-code-linecontent whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: lineHtml || "<br/>" }}
                  />
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
