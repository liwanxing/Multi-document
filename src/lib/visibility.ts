import type { DocDetail, Project, ProjectProduct } from "./dataStore";
export function visibleCategory(
  product: ProjectProduct,
  id: string | null,
): boolean {
  const seen = new Set<string>();
  while (id) {
    if (seen.has(id)) return false;
    seen.add(id);
    const category = product.categories.find((c) => c.id === id);
    if (!category || category.hidden) return false;
    id = category.parentId;
  }
  return true;
}
export function visibleDocument(
  doc: DocDetail,
  project: Project,
  productId?: string,
) {
  return (
    doc.status === "published" &&
    !doc.hidden &&
    !!doc.placements?.some(
      (p) =>
        p.projectId === project.id &&
        (!productId || p.productId === productId) &&
        !!project.products?.some(
          (product) =>
            product.id === p.productId &&
            !project.hiddenProductGroups?.includes(product.group) &&
            visibleCategory(product, p.categoryId),
        ),
    )
  );
}
export function publicCatalog(project: Project): Project {
  return {
    ...project,
    products: project.products
      ?.filter((p) => !project.hiddenProductGroups?.includes(p.group))
      .map((p) => ({
        ...p,
        categories: p.categories.filter((c) => visibleCategory(p, c.id)),
      })),
  };
}
