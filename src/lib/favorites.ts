export type Favorite = {
  href: string;
  title: string;
  product: string;
  project: string;
  savedAt: string;
};
const KEY = "doc-center:favorites:v1";
export function readFavorites(): Favorite[] {
  const value = JSON.parse(localStorage.getItem(KEY) || "[]");
  return Array.isArray(value)
    ? value.filter(
        (v) =>
          typeof v?.href === "string" &&
          v.href.startsWith("/projects/") &&
          !v.href.includes("://") &&
          typeof v.title === "string" &&
          typeof v.savedAt === "string",
      )
    : [];
}
export function writeFavorites(items: Favorite[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("favorites-changed"));
}
