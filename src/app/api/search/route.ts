import { visibleDocument, publicCatalog } from "@/lib/visibility";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";
import { categoryPath } from "@/lib/projectModel";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "6", 10));

  const store = getStore();

  const hotDefaults = [
    { title: "模型价格", productName: "火山方舟" },
    { title: "套餐概览", productName: "火山方舟" },
    { title: "快速开始", productName: "火山方舟" },
    { title: "套餐概览", productName: "火山方舟" },
    { title: "快速入门", productName: "火山方舟" },
    { title: "产品简介", productName: "火山方舟" },
    { title: "快速开始", productName: "火山方舟" },
    { title: "模型列表", productName: "火山方舟" },
    { title: "创建视频生成任务", productName: "火山方舟" },
    { title: "Doubao Seedance 2.5 教程", productName: "火山方舟" },
  ];

  // Hot documents from published docs + defaults
  const publishedDocs = Object.values(store.docs).filter(
    (d) => d.status === "published" || !d.status,
  );
  const hotDocs: {
    id?: string;
    title: string;
    productName: string;
    displayName: string;
    href?: string;
  }[] = [];

  for (const doc of publishedDocs.slice(0, 10)) {
    const placement = doc.placements?.[0];
    const project =
      store.projects?.find((p) => p.id === placement?.projectId) ||
      store.projects?.[0];
    const product =
      project?.products?.find((pr) => pr.id === placement?.productId) ||
      project?.products?.[0];
    const productName = product?.name || project?.name || "火山方舟";
    hotDocs.push({
      id: doc.id,
      title: doc.title,
      productName,
      displayName: `${doc.title}-${productName}`,
      href:
        project && product
          ? `/projects/${project.slug}/products/${product.slug}/docs/${encodeURIComponent(doc.id)}`
          : undefined,
    });
  }

  for (const item of hotDefaults) {
    if (hotDocs.length >= 10) break;
    if (!hotDocs.some((h) => h.displayName.includes(item.title))) {
      hotDocs.push({
        title: item.title,
        productName: item.productName,
        displayName: `${item.title}-${item.productName}`,
      });
    }
  }

  if (!q) {
    return NextResponse.json({
      code: 0,
      data: {
        items: [],
        total: 0,
        page,
        pageSize,
        hotDocs,
      },
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

  // 1. Search in documents
  for (const doc of Object.values(store.docs)) {
    if (doc.status && doc.status !== "published") continue;
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

    if (isTitleMatch || isDescMatch || matchedSnippet) {
      const placement = doc.placements?.[0];
      const project =
        store.projects?.find((p) => p.id === placement?.projectId) ||
        store.projects?.[0];
      const product =
        project?.products?.find((pr) => pr.id === placement?.productId) ||
        project?.products?.[0];
      const catPath = product
        ? categoryPath(product, placement?.categoryId || null)
        : "";
      const breadcrumb =
        catPath && catPath !== "未分类"
          ? `来自：文档 > ${product?.name || "产品"} > ${catPath.replace(/ \/ /g, " > ")}`
          : `来自：文档 > ${product?.name || "产品"}`;
      const href =
        project && product
          ? `/projects/${project.slug}/products/${product.slug}/docs/${encodeURIComponent(doc.id)}`
          : `/docs/${encodeURIComponent(doc.id)}`;

      allResults.push({
        type: "doc",
        id: doc.id,
        title: doc.title,
        description: doc.description || "",
        snippet:
          matchedSnippet ||
          doc.description ||
          "提供全面的产品技术指南与开发者参考文档。",
        breadcrumb,
        href,
        productName: product?.name || "",
        projectName: project?.name || "",
      });
    }
  }

  // 2. Search in products
  for (const project of store.projects || []) {
    for (const p of publicCatalog(project).products || []) {
      if ((p.name + " " + p.description).toLowerCase().includes(q)) {
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
  }

  const total = allResults.length;
  const start = (page - 1) * pageSize;
  const paginated = allResults.slice(start, start + pageSize);

  return NextResponse.json({
    code: 0,
    data: {
      items: paginated,
      total,
      page,
      pageSize,
      hotDocs,
    },
  });
}
