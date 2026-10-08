import { randomUUID } from "crypto";
import type { DocDetail, DocStoreData } from "./dataStore";
import { defaultAppearance, stylePresets } from "./editor";

export function documentKey(doc: Pick<DocDetail, "productId" | "slug">) {
  return `${doc.productId}/${doc.slug}`;
}
export function library(store: DocStoreData) {
  return Object.values({ ...store.docs, ...store.drafts });
}
export function validateDocument(
  body: Partial<DocDetail>,
  store: DocStoreData,
): string | null {
  if (
    typeof body.productId !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(body.productId) ||
    typeof body.slug !== "string" ||
    !/^[a-zA-Z0-9_/-]+$/.test(body.slug)
  )
    return "文档路径无效";
  if (typeof body.title !== "string" || !body.title.trim())
    return "请输入文档标题";
  if (
    body.title.length > 160 ||
    typeof body.content !== "string" ||
    body.content.length > 5_000_000
  )
    return "标题过长或文档内容超过 5MB";
  if (body.version !== undefined && (!Number.isSafeInteger(body.version) || body.version < 0))
    return "版本号必须是非负整数";
  if (body.description !== undefined && typeof body.description !== "string")
    return "文档摘要无效";
  if (
    !Array.isArray(body.placements) ||
    !body.placements.length ||
    body.placements.length > 100
  )
    return "请至少选择一个项目 / 产品 / 分类绑定位置";
  for (const placement of body.placements) {
    const project = store.projects?.find((p) => p.id === placement?.projectId);
    const product = project?.products?.find(
      (p) => p.id === placement?.productId,
    );
    if (
      !product ||
      (placement.categoryId !== null &&
        !product.categories.some((c) => c.id === placement.categoryId))
    )
      return "绑定位置不存在，请重新选择项目、产品和分类";
  }
  if (
    new Set(
      body.placements.map(
        (p) => `${p.projectId}/${p.productId}/${p.categoryId}`,
      ),
    ).size !== body.placements.length
  )
    return "不能重复绑定同一目录";
  if (
    body.changeNote !== undefined &&
    (typeof body.changeNote !== "string" || body.changeNote.length > 500)
  )
    return "更新说明不能超过 500 字";
  if (
    body.appearance &&
    (!stylePresets.some((p) => p.id === body.appearance?.theme) ||
      !["comfortable", "compact"].includes(body.appearance.density))
  )
    return "预制样式无效";
  return null;
}
export function persistDocument(
  store: DocStoreData,
  body: DocDetail,
  publish: boolean,
): DocDetail {
  const key = documentKey(body);
  const existing = store.drafts?.[key] || store.docs[key];
  const published = store.docs[key];
  const doc: DocDetail = {
    hidden: published?.hidden ?? existing?.hidden ?? false,
    id: existing?.id || randomUUID(),
    productId: body.productId,
    slug: body.slug,
    title: body.title.trim(),
    description: body.description || "",
    content: body.content,
    placements: body.placements,
    projectIds: Array.from(new Set(body.placements!.map((p) => p.projectId))),
    changeNote: body.changeNote || "",
    appearance: body.appearance || defaultAppearance,
    status: publish ? "published" : "draft",
    version: body.version ?? existing?.version ?? 1,
    updatedAt: new Date().toISOString(),
    breadcrumbs: ["文档中心", body.title.trim()],
  };
  store.drafts ||= {};
  if (publish) {
    const changes = published
      ? [
          ...(published.version !== doc.version ? ["版本号"] : []),
          ...(published.title !== doc.title ? ["标题"] : []),
          ...(published.content !== doc.content ? ["正文"] : []),
          ...(published.description !== doc.description ? ["摘要"] : []),
          ...(JSON.stringify(published.appearance) !==
          JSON.stringify(doc.appearance)
            ? ["排版样式"]
            : []),
          ...(JSON.stringify(published.placements) !==
          JSON.stringify(doc.placements)
            ? ["绑定目录"]
            : []),
        ]
      : ["首次发布"];
    store.history ||= [];
    store.history.push({
      id: randomUUID(),
      docId: doc.id,
      version: doc.version,
      title: doc.title,
      publishedAt: doc.updatedAt,
      summary:
        body.changeNote?.trim() ||
        (published
          ? changes.length
            ? `更新了${changes.join("、")}`
            : "重新发布文档"
          : "文档首次发布"),
      changes,
      placements: doc.placements || [],
      content: doc.content,
      appearance: doc.appearance,
    });
    doc.changeNote = "";
    store.docs[key] = doc;
    delete store.drafts[key];
  } else {
    store.drafts[key] = doc;
  }
  return doc;
}
