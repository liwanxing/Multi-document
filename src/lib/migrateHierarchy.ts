import type {
  DocCategory,
  DocDetail,
  DocPlacement,
  DocStoreData,
  DocTreeNode,
  Project,
  ProjectProduct,
} from "./dataStore";

// Version 2 restores the original product catalog inside one complete project.
// Existing user-created projects and all document/draft content are preserved.
export function migrateHierarchy(store: DocStoreData): boolean {
  if (store.schemaVersion === 2) return false;
  // 旧版（schemaVersion 1）JSON 才带 trees 字段；v2 起 trees 已彻底移除，
  // 这里仅从遗留数据中取值，不依赖数据库表
  const legacyTrees =
    (store as DocStoreData & { trees?: Record<string, DocTreeNode[]> }).trees ??
    {};
  const allProducts = store.categories.flatMap((c) =>
    c.products.map((product) => ({ ...product, group: c.name })),
  );
  const legacyIds = new Set(allProducts.map((p) => p.code));
  const customProjects = (store.projects || []).filter(
    (p) => !legacyIds.has(p.id),
  );
  let projectId = "zhongguang";
  while (customProjects.some((p) => p.id === projectId || p.slug === projectId))
    projectId += "-docs";
  const folders = (
    nodes: DocTreeNode[],
    parentId: string | null = null,
  ): DocCategory[] =>
    nodes.flatMap((node) =>
      node.type === "folder"
        ? [
            { id: node.id, name: node.title, parentId },
            ...folders(node.children || [], node.id),
          ]
        : [],
    );
  const products: ProjectProduct[] = allProducts.map((product) => ({
    id: product.code,
    slug: product.code.replace(/_/g, "-"),
    name: product.name,
    description: product.description,
    group: product.group,
    categories: folders(legacyTrees[product.code] || []),
  }));
  const primary: Project = {
    id: projectId,
    slug: projectId,
    name: "中广云",
    company: "中广云",
    description: "中广云产品文档中心，统一查阅产品指南、开发文档与产品动态。",
    updatedAt: new Date().toISOString(),
    products,
  };
  store.projects = [
    primary,
    ...customProjects.map((project) => ({
      ...project,
      products: project.products || [
        {
          id: "general",
          slug: "general",
          name: "通用文档",
          group: "产品与服务",
          description: "",
          categories: [],
        },
      ],
    })),
  ];
  store.legacyProjectAliases = Object.fromEntries(
    allProducts.map((p) => [p.code, { projectId, productId: p.code }]),
  );
  const locate = (
    nodes: DocTreeNode[],
    doc: DocDetail,
    parentId: string | null = null,
  ): string | null | undefined => {
    for (const node of nodes) {
      if (node.type === "doc" && (node.slug === doc.slug || node.id === doc.id))
        return parentId;
      if (node.children) {
        const found = locate(node.children, doc, node.id);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  for (const doc of [
    ...Object.values(store.docs),
    ...Object.values(store.drafts || {}),
  ]) {
    const oldIds = doc.projectIds?.length ? doc.projectIds : [doc.productId];
    const placements: DocPlacement[] = oldIds.map((oldId) => {
      const alias = store.legacyProjectAliases![oldId];
      if (alias)
        return {
          ...alias,
          categoryId: locate(legacyTrees[oldId] || [], doc) || null,
        };
      const custom = store.projects!.find((p) => p.id === oldId);
      return {
        projectId: custom?.id || projectId,
        productId: custom?.products?.[0]?.id || products[0].id,
        categoryId: null,
      };
    });
    doc.placements = placements;
    doc.projectIds = Array.from(new Set(placements.map((p) => p.projectId)));
  }
  store.drafts ||= {};
  store.history = Object.values(store.docs)
    .filter((doc) => doc.status === "published")
    .map((doc) => ({
      id: `baseline-${doc.id}-${doc.version}`,
      docId: doc.id,
      version: doc.version,
      title: doc.title,
      publishedAt: doc.updatedAt,
      summary: "已有发布版本收录；更早的修改记录未保存。",
      changes: ["已有版本"],
      placements: doc.placements || [],
      content: doc.content,
      appearance: doc.appearance,
      baseline: true,
    }));
  store.schemaVersion = 2;
  return true;
}
