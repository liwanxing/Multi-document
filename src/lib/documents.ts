import { randomUUID } from "crypto";
import type { DocDetail, DocStoreData } from "./dataStore";
import { defaultAppearance, stylePresets } from "./editor";

export function documentKey(doc: Pick<DocDetail, "productId" | "slug">) {
  return `${doc.productId}/${doc.slug}`;
}
export function library(store: DocStoreData) {
  return Object.values({ ...store.docs, ...store.drafts });
}
/**
 * 按 id 在已发布与草稿两行里寻址文档。
 * 草稿与已发布是两行、两个 id，而 library() 合并时草稿会覆盖同 key 的已发布行
 * （列表只显示最新编辑态）——被覆盖的已发布行就按 id 找不到了。
 * bind、删除、上下架这类拿着已发布 id 来的操作必须走这里，不能走 library()。
 */
export function findDocById(
  store: DocStoreData,
  id: string,
): DocDetail | undefined {
  return (
    Object.values(store.docs).find((d) => d.id === id) ??
    Object.values(store.drafts || {}).find((d) => d.id === id)
  );
}
/**
 * 文档的代表行：有草稿返回草稿（最新编辑态），否则返回已发布行。
 * 与 library() 列表"草稿覆盖已发布"的展示语义一致，但按 id 寻址不丢行——
 * bind/unbind 的返回值用它，让编辑器拿到的永远是最新编辑态。
 */
export function representativeDoc(
  store: DocStoreData,
  id: string,
): DocDetail | undefined {
  const doc = findDocById(store, id);
  if (!doc) return undefined;
  const key = documentKey(doc);
  return store.drafts?.[key] ?? store.docs[key];
}
/**
 * 文档在已发布行上的 id——目录排序（docOrder）与版本历史的锚。
 * 传入 id 可指向任一行；没有已发布行（从未发布）时退回传入行自身的 id。
 */
export function publishedIdOf(store: DocStoreData, id: string): string | undefined {
  const doc = findDocById(store, id);
  if (!doc) return undefined;
  return store.docs[documentKey(doc)]?.id ?? doc.id;
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
  opts?: { actor?: string },
): DocDetail {
  const key = documentKey(body);
  const existingDraft = store.drafts?.[key];
  const published = store.docs[key];
  const existing = existingDraft || published;
  // documents 表里已发布与草稿是两行（unique(productId, slug, status)），而 id 是主键，
  // 两行不能共用同一个 id——否则落库时草稿行会按同 id 覆盖已发布行，前台已发布内容丢失。
  // 因此：存草稿一律给草稿行独立 id（已发布行保持原样，"存草稿不影响前台"由数据层保证）；
  // 发布时沿用已发布行的 id，让 doc_revisions.docId 稳定指向同一行；
  // 首次发布（尚无已发布行）则沿用草稿行的 id，草稿行就地"转正"为已发布行。
  const docId = publish
    ? published?.id ?? existingDraft?.id ?? randomUUID()
    : existingDraft?.id ?? randomUUID();
  const doc: DocDetail = {
    hidden: published?.hidden ?? existing?.hidden ?? false,
    id: docId,
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
      publishedBy: opts?.actor,
    });
    doc.changeNote = "";
    store.docs[key] = doc;
    delete store.drafts[key];
  } else {
    store.drafts[key] = doc;
  }
  return doc;
}
