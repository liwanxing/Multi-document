import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import hljs from "highlight.js";
import {
  getHighlightLang,
  formatDisplayLang,
  splitHighlightedHtmlLines,
} from "../src/lib/codeHighlight.ts";
import { sanitizeMarkup } from "../src/lib/safeMarkdown.ts";

console.log("Starting code block auto-wrap verification tests...");

// 1. Verify getHighlightLang and formatDisplayLang
assert.strictEqual(getHighlightLang("curl"), "bash");
assert.strictEqual(getHighlightLang("py"), "python");
assert.strictEqual(getHighlightLang("golang"), "go");
assert.strictEqual(formatDisplayLang("curl"), "Bash");
assert.strictEqual(formatDisplayLang("py"), "Python");
assert.strictEqual(formatDisplayLang("json"), "JSON");
console.log("✓ Language normalization and formatDisplayLang verified");

// 2. Verify splitHighlightedHtmlLines tag preservation
const multilineCode = `/* header comment\n   line 2 of comment */\nfunction test() {\n  return "ok";\n}`;
const highlighted = hljs.highlight(multilineCode, { language: "javascript" }).value;
const lines = splitHighlightedHtmlLines(highlighted);

assert.strictEqual(lines.length, 5);
assert.ok(lines[0].includes('<span class="hljs-comment">'));
assert.ok(lines[0].endsWith('</span>'));
assert.ok(lines[1].includes('<span class="hljs-comment">'));
assert.ok(lines[1].endsWith('</span>'));
assert.ok(lines[2].includes('<span class="hljs-keyword">function</span>'));
console.log("✓ splitHighlightedHtmlLines properly distributes open/close tags across lines");

// 3. Verify safeMarkdown allows data-code attributes
const testHtml = '<button type="button" data-code="console.log(%22hello%22)" class="doc-code-copy-btn">Copy</button>';
const sanitized = sanitizeMarkup(testHtml);
assert.ok(sanitized.includes('data-code="console.log(%22hello%22)"'));
console.log("✓ safeMarkdown retains data-code attribute");

// 4. Verify MarkdownRenderer.tsx implementation
const markdownRendererPath = path.resolve("src/components/MarkdownRenderer.tsx");
const markdownRendererSrc = fs.readFileSync(markdownRendererPath, "utf-8");
assert.ok(markdownRendererSrc.includes("doc-code-line"));
assert.ok(markdownRendererSrc.includes("doc-code-linecontent"));
assert.ok(markdownRendererSrc.includes("whitespace-pre-wrap break-all"));
assert.ok(markdownRendererSrc.includes("data-code"));
console.log("✓ MarkdownRenderer single code block auto-wrap structure verified");

// 5. Verify CodeTabs.tsx implementation
const codeTabsPath = path.resolve("src/components/CodeTabs.tsx");
const codeTabsSrc = fs.readFileSync(codeTabsPath, "utf-8");
assert.ok(codeTabsSrc.includes("doc-code-line"));
assert.ok(codeTabsSrc.includes("doc-code-linecontent"));
assert.ok(codeTabsSrc.includes("whitespace-pre-wrap break-all"));
console.log("✓ CodeTabs multi-tab code block auto-wrap structure verified");

// 6. Verify CSS styling rules in globals.css and document-reference.css
const globalsCss = fs.readFileSync(path.resolve("src/app/globals.css"), "utf-8");
assert.ok(globalsCss.includes(".doc-code-linecontent"));
assert.ok(globalsCss.includes("overflow-wrap: anywhere !important"));
assert.ok(globalsCss.includes("white-space: pre-wrap !important"));

const docRefCss = fs.readFileSync(path.resolve("src/app/document-reference.css"), "utf-8");
assert.ok(docRefCss.includes(".product-reading-article .doc-code-box pre"));
assert.ok(docRefCss.includes("overflow-wrap: anywhere !important"));
console.log("✓ Global and document CSS auto-wrap rules verified");

console.log("\nAll code block auto-wrap verification tests passed successfully!");
