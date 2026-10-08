import hljs from "highlight.js";

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
