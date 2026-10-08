import type { CodeTabItem } from "./dataStore";

// 本文件保持自包含（仅类型导入），便于 node 单测直接加载。

/**
 * 多语言代码 Tab 的标签映射，与 :::tabs 组件既有标签保持一致。
 */
export function formatTabLabel(rawLang: string): string {
  const l = (rawLang || "").toLowerCase().trim();
  if (l === "curl") return "Curl";
  if (l === "python") return "Python";
  if (l === "go") return "Go";
  if (l === "java") return "Java";
  if (l === "openai-sdk") return "OpenAI SDK";
  if (l === "typescript" || l === "ts") return "TypeScript";
  if (l === "rust") return "Rust";
  return l ? l.toUpperCase() : "Code";
}

// 火山引擎等文档站复制出来的多语言代码块是 HTML Tabs 结构：
//   <Tabs>
//   <Tab zoneid="..." title="Curl">
//   <TabTitle>Curl</TabTitle>
//
//   ```Bash
//   curl ...
//   ```
//
//   </Tab>
//   </Tabs>
// 这里把它解析成与 :::tabs 相同的 CodeTabItem 列表，正文内容保持原样不改写。

const TAB_OPEN_RE = /^<tab(\s[^>]*)?>\s*$/i;
const TAB_CLOSE_RE = /^<\/tab\s*>$/i;
const TAB_TITLE_ATTR_RE = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const TAB_TITLE_TAG_RE = /<tabtitle(?:\s[^>]*)?>([\s\S]*?)<\/tabtitle>/i;
const CODE_FENCE_RE = /(`{3,}|~{3,})[ \t]*([^\n]*)\n([\s\S]*?)\1/g;

/**
 * 解析 <Tabs><Tab title="...">…</Tab></Tabs> 结构为多语言代码项。
 * 结构不完整或没有 <Tab> 子项时返回空数组，由调用方回退为普通 Markdown 渲染。
 */
export function parseHtmlTabs(content: string): CodeTabItem[] {
  const chunks: { attrs: string; body: string[] }[] = [];
  let current: { attrs: string; body: string[] } | null = null;
  // 与 MarkdownRenderer.readContainer 相同的围栏跟踪，避免代码块内的
  // 类标签文本被误认为 Tab 边界。
  let fence = "";

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (
        fenceMatch[1][0] === fence[0] &&
        fenceMatch[1].length >= fence.length
      )
        fence = "";
    }
    if (!fence) {
      if (TAB_OPEN_RE.test(line)) {
        current = { attrs: line, body: [] };
        chunks.push(current);
        continue;
      }
      if (TAB_CLOSE_RE.test(line)) {
        current = null;
        continue;
      }
    }
    if (current) current.body.push(rawLine);
  }

  const items: CodeTabItem[] = [];
  for (const chunk of chunks) {
    const body = chunk.body.join("\n");
    const attrTitle = TAB_TITLE_ATTR_RE.exec(chunk.attrs);
    const tagTitle = TAB_TITLE_TAG_RE.exec(body);
    const title = (attrTitle?.[1] || attrTitle?.[2] || tagTitle?.[1] || "").trim();

    const codeBlocks: { lang: string; code: string }[] = [];
    CODE_FENCE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CODE_FENCE_RE.exec(body)) !== null) {
      codeBlocks.push({
        lang: (match[2] || "").trim().split(/\s+/)[0].toLowerCase(),
        code: match[3] ?? "",
      });
    }

    let code = "";
    let syntax = "";
    if (codeBlocks.length) {
      code = codeBlocks.map((block) => block.code.trim()).join("\n\n");
      syntax = codeBlocks[0].lang;
    } else {
      // 没有代码围栏时把剩余文本当作代码展示（去掉 TabTitle 等标签）。
      code = body
        .replace(TAB_TITLE_TAG_RE, "")
        .replace(/<[^>]+>/g, "")
        .trim();
    }
    if (!title && !code) continue;
    items.push({
      language: title || formatTabLabel(syntax),
      syntax: syntax || title.toLowerCase(),
      code,
    });
  }
  return items;
}
