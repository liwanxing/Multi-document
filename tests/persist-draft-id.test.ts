// persistDocument 草稿/已发布 id 语义回归测试
// 运行：npx tsx tests/persist-draft-id.test.ts
//
// 背景：documents 表的 id 是主键，已发布与草稿是两行（unique(productId, slug, status)），
// 两行不能共用 id。此测试锁定四条不变式：
//   1. 存草稿不触碰已发布行（内容、id 都不动）——"存草稿不影响前台"
//   2. 草稿行有独立 id，且重复保存草稿 id 稳定
//   3. 发布沿用已发布行的 id，doc_revisions.docId 始终指向同一行
//   4. 首次发布时草稿行就地转正（id 不变，status 变 published）
import { persistDocument, documentKey } from "../src/lib/documents";
import type { DocDetail, DocStoreData } from "../src/lib/dataStore";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` —— ${detail}` : ""}`);
  }
}

function makeBody(overrides: Partial<DocDetail> = {}): DocDetail {
  return {
    id: "",
    productId: "p-ark",
    slug: "doc-intro",
    title: "文档标题",
    description: "",
    breadcrumbs: [],
    updatedAt: new Date().toISOString(),
    status: "draft",
    version: 1,
    content: "正文内容",
    placements: [{ projectId: "proj-1", productId: "p-ark", categoryId: null }],
    ...overrides,
  } as DocDetail;
}

function newStore(): DocStoreData {
  return { docs: {}, history: [] } as unknown as DocStoreData;
}

console.log("场景一：首次发布（无已发布、无草稿）");
{
  const store = newStore();
  const doc = persistDocument(store, makeBody(), true);
  const key = documentKey(doc);
  check("进入 docs 且状态 published", store.docs[key]?.status === "published");
  check("历史条目的 docId 与已发布行 id 一致", store.history?.[0]?.docId === store.docs[key].id);
}

console.log("场景二：对已发布文档存草稿（原 bug 的触发场景）");
{
  const store = newStore();
  const pub = persistDocument(store, makeBody({ content: "已发布版本" }), true);
  const key = documentKey(pub);
  const publishedId = store.docs[key].id;

  const draft = persistDocument(store, makeBody({ content: "草稿修改" }), false);
  check("草稿行 id 与已发布行 id 不同", draft.id !== publishedId, `draft=${draft.id} published=${publishedId}`);
  check("已发布行内容未被草稿触碰", store.docs[key].content === "已发布版本");
  check("已发布行 id 未变", store.docs[key].id === publishedId);
  check("草稿进入 drafts", store.drafts?.[key]?.content === "草稿修改");

  const draft2 = persistDocument(store, makeBody({ content: "草稿再改" }), false);
  check("重复保存草稿 id 稳定", draft2.id === draft.id);
}

console.log("场景三：发布带草稿的文档（版本升级）");
{
  const store = newStore();
  const pub = persistDocument(store, makeBody({ content: "v1" }), true);
  const key = documentKey(pub);
  const publishedId = store.docs[key].id;

  persistDocument(store, makeBody({ content: "草稿" }), false);
  // 不传 version：发布时系统自动递增（v1 → v2），忽略客户端传入值
  const doc = persistDocument(store, makeBody({ content: "v2" }), true);

  check("发布后已发布行 id 保持不变", store.docs[key].id === publishedId, `new=${store.docs[key].id} old=${publishedId}`);
  check("已发布内容更新为草稿内容", store.docs[key].content === "v2");
  check("版本号自动递增为 2", doc.version === 2, `实际 ${doc.version}`);
  check("草稿已被清除", store.drafts?.[key] === undefined);
  check("两条历史的 docId 一致且都指向已发布行",
    store.history?.length === 2 && store.history.every((r) => r.docId === publishedId));
}

console.log("场景四：未发布文档的草稿直接首次发布（转正）");
{
  const store = newStore();
  const draft = persistDocument(store, makeBody({ content: "草稿" }), false);
  const key = documentKey(draft);
  const draftId = draft.id;

  const doc = persistDocument(store, makeBody({ content: "定稿", version: 1 }), true, { actor: "admin" });
  check("转正后沿用草稿行的 id", store.docs[key]?.id === draftId, `pub=${store.docs[key]?.id} draft=${draftId}`);
  check("首次发布版本为草稿版本 1", doc.version === 1, `实际 ${doc.version}`);
  check("状态变为 published", store.docs[key]?.status === "published");
  check("草稿已清除", store.drafts?.[key] === undefined);
  check("历史的 docId 指向转正后的行", store.history?.[0]?.docId === draftId);
  check("历史留痕发布人", store.history?.[0]?.publishedBy === "admin");
  check("未传 actor 时留痕为空", (() => {
    const s2 = newStore();
    persistDocument(s2, makeBody(), true);
    return s2.history?.[0]?.publishedBy === undefined;
  })());
  // 已转正文档再次发布：版本自动 +1（不再依赖手填）
  const again = persistDocument(store, makeBody({ content: "修订" }), true);
  check("再发布自动递增为 2", again.version === 2, `实际 ${again.version}`);
  check("再发布产生第二条历史", store.history?.length === 2);
}

if (failures > 0) {
  console.error(`\n${failures} 项断言失败`);
  process.exit(1);
}
console.log("\n全部通过");
