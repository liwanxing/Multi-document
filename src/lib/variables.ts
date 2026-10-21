import type { Project } from "./dataStore";
export function renderVariables(
  source: string,
  project: Project,
  params: Record<string, string | string[] | undefined> = {},
) {
  const values: Record<string, string> = {
    brand_name: project.brandName || project.name,
    company_name: project.company || project.name,
  };
  // 项目自定义字段：文档里 {{key}} 引用；内置两个变量优先，不允许被覆盖
  for (const f of project.customFields ?? []) {
    const key = f.key?.trim();
    if (key && f.value && !(key in values)) values[key] = f.value;
  }
  for (const key of Object.keys(values))
    if (typeof params[key] === "string" && params[key])
      values[key] = (params[key] as string).slice(0, 200);
  return source.replace(
    /\{\{\s*(\w+)\s*(?:\|\s*([^}]*))?\}\}/g,
    (raw, key, fallback) => {
      const value = values[key] || fallback;
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
