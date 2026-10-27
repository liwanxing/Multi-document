import hljs from "highlight.js/lib/core";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import less from "highlight.js/lib/languages/less";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import nginx from "highlight.js/lib/languages/nginx";
import perl from "highlight.js/lib/languages/perl";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scala from "highlight.js/lib/languages/scala";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

// 只用 highlight.js 的 core + 文档常见语言。全量的 `highlight.js` 入口会把
// 190 多种语言一起打进浏览器（开发模式下即 1MB 以上的未压缩脚本），是文档页
// 首屏加载的主要负担之一。没注册的语言由 getHighlightLang 退化成纯文本。
export { hljs };

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("less", less);
hljs.registerLanguage("lua", lua);
hljs.registerLanguage("makefile", makefile);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("nginx", nginx);
hljs.registerLanguage("perl", perl);
hljs.registerLanguage("php", php);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("powershell", powershell);
hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("scala", scala);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

/**
 * Normalizes language identifier to a highlight.js supported language
 */
export function getHighlightLang(raw: string): string {
  let lang = (raw || "").toLowerCase().trim();
  if (lang === "curl" || lang === "sh" || lang === "shell" || lang === "zsh") lang = "bash";
  if (lang === "openai-sdk" || lang === "js") lang = "javascript";
  if (lang === "py") lang = "python";
  if (lang === "golang") lang = "go";
  if (lang === "ts") lang = "typescript";
  if (lang === "yml") lang = "yaml";
  if (lang === "cs") lang = "csharp";
  if (lang === "c++") lang = "cpp";
  if (lang === "rs") lang = "rust";
  if (lang === "rb") lang = "ruby";
  if (lang === "kt") lang = "kotlin";
  if (lang === "md") lang = "markdown";
  if (lang === "html" || lang === "vue" || lang === "svg") lang = "xml";
  return hljs.getLanguage(lang) ? lang : "plaintext";
}

/**
 * Formats language identifier for display badge in code blocks
 */
export function formatDisplayLang(raw: string): string {
  const l = (raw || "").toLowerCase().trim();
  if (!l || l === "plaintext" || l === "text") return "Code";
  if (l === "curl" || l === "bash" || l === "sh" || l === "shell" || l === "zsh") return "Bash";
  if (l === "python" || l === "py") return "Python";
  if (l === "javascript" || l === "js" || l === "openai-sdk") return "JavaScript";
  if (l === "typescript" || l === "ts") return "TypeScript";
  if (l === "json") return "JSON";
  if (l === "go" || l === "golang") return "Go";
  if (l === "java") return "Java";
  if (l === "cpp" || l === "c++") return "C++";
  if (l === "c") return "C";
  if (l === "csharp" || l === "c#" || l === "cs") return "C#";
  if (l === "html") return "HTML";
  if (l === "css") return "CSS";
  if (l === "sql") return "SQL";
  if (l === "yaml" || l === "yml") return "YAML";
  if (l === "xml") return "XML";
  if (l === "rust" || l === "rs") return "Rust";
  if (l === "php") return "PHP";
  if (l === "ruby" || l === "rb") return "Ruby";
  if (l === "swift") return "Swift";
  if (l === "kotlin" || l === "kt") return "Kotlin";
  if (l === "markdown" || l === "md") return "Markdown";
  if (l === "powershell" || l === "pwsh" || l === "ps1") return "PowerShell";
  if (l === "bat" || l === "batch" || l === "cmd") return "Batch";
  if (l === "dockerfile" || l === "docker") return "Dockerfile";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Splits highlighted HTML string into individual lines while properly
 * maintaining, closing, and reopening nested HTML tags (spans) across line breaks.
 */
export function splitHighlightedHtmlLines(html: string): string[] {
  const lines = html.split("\n");
  const stack: { tag: string; openHtml: string }[] = [];
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const prefix = stack.map((item) => item.openHtml).join("");

    const tagRegex = /<(\/)?([a-zA-Z0-9_-]+)([^>]*)>/g;
    let match: RegExpExecArray | null;
    const currentStack = [...stack];

    while ((match = tagRegex.exec(rawLine)) !== null) {
      const isClose = match[1] === "/";
      const tagName = match[2];
      const fullTag = match[0];
      if (isClose) {
        currentStack.pop();
      } else {
        currentStack.push({ tag: tagName, openHtml: fullTag });
      }
    }

    let postfix = "";
    for (let j = currentStack.length - 1; j >= 0; j--) {
      postfix += `</${currentStack[j].tag}>`;
    }

    result.push(prefix + rawLine + postfix);
    stack.length = 0;
    stack.push(...currentStack);
  }

  return result;
}
