export function safeComponentStyle(value: string): Record<string, string> {
  if (!value || typeof value !== "string") return {};
  const result: Record<string, string> = {};
  const allowed =
    /^(color|background|background-color|border|border-color|border-width|border-style|border-radius|border-top|border-bottom|border-left|border-right|box-shadow|padding|padding-top|padding-bottom|padding-left|padding-right|margin|margin-top|margin-bottom|margin-left|margin-right|gap|row-gap|column-gap|font-size|font-weight|font-family|font-style|line-height|letter-spacing|text-align|text-decoration|width|min-width|max-width|height|min-height|max-height|display|flex|flex-direction|align-items|justify-content|flex-wrap|opacity|overflow|overflow-x|overflow-y)$/i;

  for (const rule of value.split(";")) {
    const trimmed = rule.trim();
    if (!trimmed) continue;
    const i = trimmed.indexOf(":");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim().toLowerCase();
    const val = trimmed.slice(i + 1).trim();

    if (!allowed.test(key)) continue;
    if (/url\(|expression\(|javascript:|@import|<script|var\(/i.test(val)) {
      continue;
    }
    if (!/^[#\w\s.,%()!/'"-]+$/i.test(val)) {
      continue;
    }
    const cleanVal = val.replace(/\s*!important/i, "").trim();
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = cleanVal;
  }
  return result;
}
