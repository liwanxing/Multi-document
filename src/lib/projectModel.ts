import type {
  DocCategory,
  DocDetail,
  DocPlacement,
  Project,
  ProjectProduct,
  DocRevision,
} from "./dataStore";

export function categoryPath(
  product: ProjectProduct,
  categoryId: string | null,
): string {
  const parts: string[] = [];
  let current = product.categories.find((c) => c.id === categoryId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    parts.unshift(current.name);
    current = product.categories.find((c) => c.id === current!.parentId);
  }
  return parts.join(" / ") || "未分类";
}
export function categoryOptions(
  categories: DocCategory[],
  parentId: string | null = null,
  depth = 0,
): (DocCategory & { depth: number })[] {
  if (depth > categories.length) return [];
  return categories
    .filter((c) => c.parentId === parentId)
    .flatMap((c) => [
      { ...c, depth },
      ...categoryOptions(categories, c.id, depth + 1),
    ]);
}
export function placementKey(placement: DocPlacement) {
  return `${placement.projectId}/${placement.productId}/${placement.categoryId || ""}`;
}
export function sortDocsByCatalog<
  T extends { id: string },
>(docs: T[], product?: ProjectProduct | null): T[] {
  if (!product?.docOrder?.length) return docs;
  const rank = new Map(product.docOrder.map((id, index) => [id, index]));
  return docs
    .map((doc, index) => [doc, index] as const)
    .sort((a, b) => {
      const ra = rank.get(a[0].id) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b[0].id) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || a[1] - b[1];
    })
    .map(([doc]) => doc);
}
export function placementLabel(projects: Project[], placement: DocPlacement) {
  const project = projects.find((p) => p.id === placement.projectId);
  const product = project?.products?.find((p) => p.id === placement.productId);
  return `${project?.name || "未知项目"} / ${product?.name || "未知产品"} / ${product ? categoryPath(product, placement.categoryId) : "未分类"}`;
}
export function isBound(
  doc: DocDetail,
  projectId: string,
  productId?: string,
  categoryId?: string | null,
) {
  return (
    doc.placements?.some(
      (p) =>
        p.projectId === projectId &&
        (!productId || p.productId === productId) &&
        (categoryId === undefined || p.categoryId === categoryId),
    ) || false
  );
}
export function productHref(project: Project, product: ProjectProduct) {
  return `/projects/${project.slug}/products/${product.slug}`;
}
export function publishedHref(projects: Project[], doc: DocDetail) {
  const binding = doc.placements?.[0];
  const project = projects.find((p) => p.id === binding?.projectId);
  const product = project?.products?.find((p) => p.id === binding?.productId);
  return project && product
    ? `${productHref(project, product)}/docs/${encodeURIComponent(doc.id)}`
    : "";
}
export function visibleHistory(
  history: DocRevision[],
  documents: DocDetail[],
  projectId: string,
  productId: string,
) {
  const ids = new Set(
    documents
      .filter(
        (doc) =>
          doc.status === "published" && isBound(doc, projectId, productId),
      )
      .map((doc) => doc.id),
  );
  return history
    .filter(
      (entry) =>
        ids.has(entry.docId) &&
        entry.placements.some(
          (p) => p.projectId === projectId && p.productId === productId,
        ),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const DEFAULT_GROUP_ICONS: Record<string, string> = {
  "人工智能与算法": "sparkles",
  "人工智能": "sparkles",
  "AI": "sparkles",
  "计算": "cpu",
  "计算与网络": "cpu",
  "云服务器": "server",
  "存储": "database",
  "存储与CDN": "database",
  "数据库": "database",
  "容器与中间件": "boxes",
  "容器": "boxes",
  "网络": "globe",
  "CDN与边缘": "cloud",
  "视频云": "video-gen",
  "多媒体": "video-gen",
  "大数据": "data-analytics",
  "大数据与分析": "data-analytics",
  "安全": "shield",
  "安全与风控": "shield",
  "企业应用": "settings",
  "企业服务": "settings",
  "服务支持": "help-circle",
  "开发工具": "code",
  "开发与运维": "terminal",
};

export function resolveGroupIcon(
  group: string,
  groupIcons?: Record<string, string>,
): string {
  if (groupIcons?.[group]) return groupIcons[group];
  if (DEFAULT_GROUP_ICONS[group]) return DEFAULT_GROUP_ICONS[group];
  const lower = group.toLowerCase();
  for (const [key, icon] of Object.entries(DEFAULT_GROUP_ICONS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return icon;
    }
  }
  return "folder";
}

