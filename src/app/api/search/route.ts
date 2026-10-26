import { visibleDocument, publicCatalog } from "@/lib/visibility";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";
import { getAuthenticatedUser } from "@/lib/auth";
import { categoryPath } from "@/lib/projectModel";

export const dynamic = "force-dynamic";

/**
 * 前台搜索。
 *
 * 链接分享模式：读者拿到的是一条文档链接，允许在**当前项目内**自由浏览，
 * 但不允许顺着搜索发现其它项目。因此：
 * - 带 `project` 参数时只在该项目范围内检索（前台两个入口都会带上）；
 * - 不带 `project` 时不给未登录用户兜底：全局检索仅管理员可用（后台/排障），
 *   未登录一律返回空结果，避免顺着搜索发现其它项目的路径与内容。
 * - 无论哪种范围，都先过 visibleDocument：下架文档、隐藏分类、隐藏产品组一律不出现。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "6", 10));
  const projectSlug = (searchParams.get("project") || "").trim();

  const store = await getStore();
  const allProjects = store.projects || [];
  // 仅在无 project 参数（全局检索路径）时才需要判登录态，项目内检索不加开销
  const adminUser = projectSlug ? null : await getAuthenticatedUser(request);
  const scope = projectSlug
    ? allProjects.filter((p) => p.slug === projectSlug)
    : adminUser
      ? allProjects
      : [];

  // 范围内可见的文档：已发布 + 未下架 + 至少挂在一个可见的项目/产品/分类上
  const visibleDocs = Object.values(store.docs).filter(
    (doc) =>
      doc.status === "published" &&
      !doc.hidden &&
      scope.some((project) => visibleDocument(doc, project)),
  );

  // 文档 → 本项目范围内的落地链接；不在范围内的文档不产生结果
  const resolveHref = (doc: (typeof visibleDocs)[number]) => {
    const placement = doc.placements?.find((p) =>
      scope.some((s) => s.id === p.projectId),
    );
    const project = scope.find((p) => p.id === placement?.projectId);
    const product = project?.products?.find((p) => p.id === placement?.productId);
    if (!project || !product) return null;
    return {
      project,
      product,
      href: `/projects/${project.slug}/products/${product.slug}/docs/${encodeURIComponent(doc.id)}`,
    };
  };

  const hotDocs: {
    id?: string;
    title: string;
    productName: string;
    displayName: string;
    href?: string;
  }[] = [];

  for (const doc of visibleDocs) {
    if (hotDocs.length >= 10) break;
    const target = resolveHref(doc);
    if (!target) continue;
    hotDocs.push({
      id: doc.id,
      title: doc.title,
      productName: target.product.name,
      displayName: `${doc.title}-${target.product.name}`,
      href: target.href,
    });
  }

  if (!q) {
    return NextResponse.json({
      code: 0,
      data: { items: [], total: 0, page, pageSize, hotDocs },
    });
  }

  const allResults: {
    type: "product" | "doc";
    id: string;
    title: string;
    description: string;
    snippet: string;
    breadcrumb: string;
    href: string;
    productName: string;
    projectName: string;
  }[] = [];

  // 1. 文档：标题 / 描述 / 正文片段
  for (const doc of visibleDocs) {
    const isTitleMatch = doc.title.toLowerCase().includes(q);
    const isDescMatch = (doc.description || "").toLowerCase().includes(q);
    let matchedSnippet = "";

    if (doc.content) {
      const cleanContent = doc.content
        .replace(/[#*`~>-]/g, " ")
        .replace(/\s+/g, " ");
      const idx = cleanContent.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(cleanContent.length, idx + 90);
        matchedSnippet =
          (start > 0 ? "..." : "") +
          cleanContent.substring(start, end).trim() +
          "...";
      }
    }

    if (!isTitleMatch && !isDescMatch && !matchedSnippet) continue;

    const target = resolveHref(doc);
    if (!target) continue;
    const { project, product, href } = target;
    const placement = doc.placements?.find(
      (p) => p.projectId === project.id && p.productId === product.id,
    );
    const catPath = categoryPath(product, placement?.categoryId || null);

    allResults.push({
      type: "doc",
      id: doc.id,
      title: doc.title,
      description: doc.description || "",
      snippet:
        matchedSnippet ||
        doc.description ||
        "提供全面的产品技术指南与开发者参考文档。",
      breadcrumb:
        catPath && catPath !== "未分类"
          ? `来自：文档 > ${product.name} > ${catPath.replace(/ \/ /g, " > ")}`
          : `来自：文档 > ${product.name}`,
      href,
      productName: product.name,
      projectName: project.name,
    });
  }

  // 2. 产品：仅在范围内检索，隐藏产品组已被 publicCatalog 剔除
  for (const project of scope) {
    for (const p of publicCatalog(project).products || []) {
      if (!(p.name + " " + p.description).toLowerCase().includes(q)) continue;
      allResults.push({
        type: "product",
        id: p.id,
        title: p.name,
        description: p.description,
        snippet: p.description || "产品概览及核心功能指南",
        breadcrumb: `来自：产品 > ${project.name} > ${p.name}`,
        href: `/projects/${project.slug}/products/${p.slug}`,
        productName: p.name,
        projectName: project.name,
      });
    }
  }

  const total = allResults.length;
  const start = (page - 1) * pageSize;
  const paginated = allResults.slice(start, start + pageSize);

  return NextResponse.json({
    code: 0,
    data: { items: paginated, total, page, pageSize, hotDocs },
  });
}
