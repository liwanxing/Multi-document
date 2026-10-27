import type { Project } from "./dataStore";

const VARIABLE_RE = /\{\{\s*(\w+)\s*(?:\|\s*([\s\S]*?))?\s*\}\}/g;
const FENCE_RE = /^\s*(```|~~~)/;

export function renderVariables(
  source: string,
  project: Project,
) {
  const values: Record<string, string> = {
    brand_name: project.brandName || project.name,
    company_name: project.company || project.brandName || project.name,
  };
  // 项目自定义字段：文档里 {{key}} 引用；内置两个变量优先，不允许被覆盖
  for (const f of project.customFields ?? []) {
    const key = f.key?.trim();
    const value = f.value?.trim();
    if (key && value && !(key in values)) values[key] = value;
  }

  // 逐行渲染：有值按值渲染，没值用 {{name|默认值}} 的默认值，
  // 既没值也没默认值则什么都不输出——某行只剩这种变量时连整行一起删掉，
  // 避免一份共享文档在没配该变量的项目里露出 {{key}} 或留下空白行。
  const lines = source.split("\n");
  const rendered: string[] = [];
  let inFence = false;
  let droppedLine = false;
  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const result = renderLine(line, values);
    // 代码围栏内不删行，只做替换，保持代码样例原样
    if (!inFence && result.missing > 0 && result.text.trim() === "") {
      droppedLine = true;
      continue;
    }
    rendered.push(result.text);
  }
  if (!droppedLine) return rendered.join("\n");
  // 删掉整行后可能留下连续空行，代码围栏外压成一个，避免成片空白
  const merged: string[] = [];
  let fence = false;
  for (const line of rendered) {
    if (FENCE_RE.test(line)) fence = !fence;
    if (
      !fence &&
      line.trim() === "" &&
      merged.length > 0 &&
      merged[merged.length - 1].trim() === ""
    )
      continue;
    merged.push(line);
  }
  return merged.join("\n");
}

/** 渲染一行，并统计这一行里"既没值也没默认值"的变量个数 */
function renderLine(line: string, values: Record<string, string>) {
  let missing = 0;
  const text = line.replace(
    VARIABLE_RE,
    (_raw, key: string, fallback?: string) => {
      const value = values[key];
      if (value !== undefined) return escapeValue(value);
      const fallbackValue = fallback?.trim();
      if (fallbackValue) return escapeValue(fallbackValue);
      missing += 1;
      return "";
    },
  );
  return { text, missing };
}

function escapeValue(value: string) {
  return value
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    )
    .replace(/[\\`*_[\]{}()#!|]/g, "\\$&");
}
