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
  return source.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (raw, key) => {
      const value = values[key];
      return value === undefined
        ? raw
        : String(value)
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
    },
  );
}
