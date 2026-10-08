import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { parseHtmlTabs, formatTabLabel } from "../src/lib/htmlTabs.ts";

const F = "```";

console.log("Starting HTML Tabs (pasted doc-site format) tests...");

// 1. 火山引擎文档原样粘贴的样例：Curl / Python / Java / Go / OpenAI
const pasted = [
  "<Tabs>",
  '<Tab zoneid="jqtmwXDEcr" title="Curl">',
  "<TabTitle>Curl</TabTitle>",
  "",
  `${F}Bash`,
  "curl https://ark.cn-beijing.volces.com/api/v3/images/generations \\",
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"model": "doubao-seedream"}\'',
  F,
  "",
  "</Tab>",
  '<Tab zoneid="eplG4UJIfG" title="Python">',
  "<TabTitle>Python</TabTitle>",
  "",
  `${F}Python`,
  "import os",
  "client = Ark(",
  '    base_url="https://ark.cn-beijing.volces.com/api/v3",',
  ")",
  F,
  "",
  "</Tab>",
  '<Tab zoneid="IAXvoGFpAS" title="Java">',
  `${F}Java`,
  "package com.ark.sample;",
  F,
  "</Tab>",
  '<Tab zoneid="C2Jwwoww6y" title="Go">',
  `${F}Go`,
  "package main",
  F,
  "</Tab>",
  '<Tab zoneid="AKJIFPPfaO" title="OpenAI">',
  `${F}Python`,
  "from openai import OpenAI",
  "print(imagesResponse.data[0].url)",
  F,
  "</Tab>",
  "</Tabs>",
].join("\n");

const items = parseHtmlTabs(pasted);
assert.strictEqual(items.length, 5);
assert.strictEqual(items[0].language, "Curl");
assert.strictEqual(items[0].syntax, "bash");
assert.ok(items[0].code.startsWith("curl https://ark.cn-beijing.volces.com"));
assert.ok(items[0].code.includes("doubao-seedream"));
assert.ok(!items[0].code.includes("TabTitle"));
assert.strictEqual(items[1].language, "Python");
assert.strictEqual(items[1].syntax, "python");
assert.strictEqual(items[2].language, "Java");
assert.strictEqual(items[3].language, "Go");
assert.strictEqual(items[4].language, "OpenAI"); // Tab title 优先于围栏语言
assert.strictEqual(items[4].syntax, "python"); // 高亮仍按代码语言
assert.ok(items[4].code.includes("imagesResponse"));
console.log("✓ Volcengine-style pasted Tabs parsed into 5 CodeTabItems");

// 2. 无 title 属性时回退：<TabTitle> 标签，再回退到围栏语言
const noTitleAttrs = [
  "<Tabs>",
  "<Tab>",
  "<TabTitle>Node.js</TabTitle>",
  `${F}JavaScript`,
  'console.log("hi")',
  F,
  "</Tab>",
  "<Tab>",
  `${F}bash`,
  "echo hello",
  F,
  "</Tab>",
  "</Tabs>",
].join("\n");
const fallbackItems = parseHtmlTabs(noTitleAttrs);
assert.strictEqual(fallbackItems.length, 2);
assert.strictEqual(fallbackItems[0].language, "Node.js");
assert.strictEqual(fallbackItems[0].syntax, "javascript");
assert.strictEqual(fallbackItems[1].language, "BASH");
assert.strictEqual(fallbackItems[1].syntax, "bash");
assert.strictEqual(fallbackItems[1].code, "echo hello");
console.log("✓ TabTitle tag and fence-language fallbacks verified");

// 3. 代码围栏内的类标签行不会被误判为 Tab 边界
const tricky = [
  "<Tabs>",
  '  <Tab title="HTML">',
  `${F}html`,
  '<Tab title="fake">',
  "<p>ok</p>",
  F,
  "</Tab>",
  "</Tabs>",
].join("\n");
const trickyItems = parseHtmlTabs(tricky);
assert.strictEqual(trickyItems.length, 1);
assert.strictEqual(trickyItems[0].language, "HTML");
assert.ok(trickyItems[0].code.includes("fake"));
console.log("✓ Tag-like lines inside code fences stay within one tab");

// 4. 结构不完整 / 非标签内容回退为普通 Markdown（空数组）
assert.deepStrictEqual(parseHtmlTabs("<Tabs>plain text</Tabs>"), []);
assert.deepStrictEqual(parseHtmlTabs("普通正文，没有 Tabs。"), []);
console.log("✓ Incomplete or non-Tabs content returns empty array");

// 5. formatTabLabel 与 :::tabs 既有标签映射保持一致
assert.strictEqual(formatTabLabel("curl"), "Curl");
assert.strictEqual(formatTabLabel("openai-sdk"), "OpenAI SDK");
assert.strictEqual(formatTabLabel("ts"), "TypeScript");
assert.strictEqual(formatTabLabel("rust"), "Rust");
assert.strictEqual(formatTabLabel("json"), "JSON");
assert.strictEqual(formatTabLabel(""), "Code");
console.log("✓ formatTabLabel legacy mapping verified");

// 6. MarkdownRenderer 已接入 <Tabs> 分支
const markdownRendererSrc = fs.readFileSync(
  path.resolve("src/components/MarkdownRenderer.tsx"),
  "utf-8",
);
assert.ok(markdownRendererSrc.includes("parseHtmlTabs"));
assert.ok(markdownRendererSrc.includes("<\\/tabs\\s*>"));
console.log("✓ MarkdownRenderer wires parseHtmlTabs for pasted <Tabs> blocks");

console.log("\nAll HTML Tabs tests passed successfully!");
