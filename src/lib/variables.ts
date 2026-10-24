import type { Project } from "./dataStore";
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
    if (key && f.value && !(key in values)) values[key] = f.value;
  }
  // 支持 {{name|默认值}} 语法（编辑器"插入变量"按钮承诺的能力）：
  // 变量有值时按值渲染；没值时用默认值；连默认值都没有才保留原文。
  return source.replace(
    /\{\{\s*(\w+)\s*(?:\|\s*([\s\S]*?))?\s*\}\}/g,
    (raw, key, fallback) => {
      const value = values[key];
      if (value === undefined) {
        return fallback !== undefined && fallback !== ""
          ? escapeValue(fallback)
          : raw;
      }
      return escapeValue(String(value));
    },
  );
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
