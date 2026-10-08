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
