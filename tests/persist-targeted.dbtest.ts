// 定向写入（persistDocumentToDb）的集成验证：需要 MySQL 在跑。
// 运行：docker compose -f docker-compose.dev.yml up -d 之后
//       npx tsx tests/persist-targeted.dbtest.ts
//
// 数据库不可用时明确喊出跳过原因并退出 0——沉默跳过会让人误以为验证过了。
// 测试用随机 slug 建临时文档，挂在库里真实存在的项目/产品下，结束时清理。
import "dotenv/config";
import type { DocStoreData } from "../src/lib/dataStore";

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { persistDocumentToDb } = await import("../src/lib/dbStore");
  const { persistDocument } = await import("../src/lib/documents");

  // 连接探活：2 秒内连不上就跳过
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rej) =>
        controller.signal.addEventListener("abort", () => rej(new Error("timeout"))),
      ),
    ]);
    clearTimeout(timer);
  } catch {
    console.log("⏭ 跳过：MySQL 不可用（Docker 没起？）。起库后重跑本脚本做真库验证。");
    process.exit(0);
  }

  // 锚点用库里的真实行（产品 id 是 UUID，不能写死），避免外键失配
  const anchor = await prisma.product.findFirst({ orderBy: { createdAt: "asc" } });
  if (!anchor) {
    console.log("⏭ 跳过：库里没有任何产品，无从挂载测试文档。");
    process.exit(0);
  }
  const productId = anchor.id;
  const projectId = anchor.projectId;

  const stamp = Date.now().toString(36);
  const slug = `dbtest_${stamp}`;
  let failures = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    if (ok) console.log(`  ✓ ${name}`);
    else {
      failures++;
      console.error(`  ✗ ${name}${detail ? ` —— ${detail}` : ""}`);
    }
  };
  const makeBody = (over: Record<string, unknown>) => ({
    id: "",
    productId,
    slug,
    title: "定向写入验证",
    description: "",
    breadcrumbs: [],
    updatedAt: new Date().toISOString(),
    status: "draft" as const,
    version: 1,
    content: "v1",
    placements: [{ projectId, productId, categoryId: null }],
    ...over,
  });
  const store = { docs: {}, history: [] } as unknown as DocStoreData;

  try {
    console.log("场景一：首次发布（插入路径）");
    const pub = persistDocument(store, makeBody({}) as never, true, { actor: "dbtest" });
    const r1 = await persistDocumentToDb(store, pub, { publish: true });
    check("写入成功", r1.ok);
    const row = await prisma.document.findUnique({ where: { id: pub.id } });
    check("published 行存在且内容正确", row?.status === "published" && row?.content === "v1");
    const rev = await prisma.docRevision.findFirst({
      where: { docId: pub.id, version: 1 },
    });
    check("版本快照落库且留痕发布人", rev?.createdBy === "dbtest", `createdBy=${rev?.createdBy}`);

    console.log("场景二：存草稿（草稿独立 id，不触碰已发布行）");
    const draft = persistDocument(store, makeBody({ content: "草稿" }) as never, false);
    const r2 = await persistDocumentToDb(store, draft, {
      publish: false, expectedUpdatedAt: undefined,
    });
    check("写入成功", r2.ok);
    check("草稿行 id 与已发布行不同", draft.id !== pub.id);
    const pubRow2 = await prisma.document.findUnique({ where: { id: pub.id } });
    check("已发布行内容未被触碰", pubRow2?.content === "v1");
    const draftRow = await prisma.document.findUnique({ where: { id: draft.id } });
    check("草稿行存在", draftRow?.status === "draft" && draftRow?.content === "草稿");

    console.log("场景三：乐观锁——基准 updatedAt 不匹配时返回冲突");
    const stale = persistDocument(store, makeBody({ content: "过期修改" }) as never, false);
    const r3 = await persistDocumentToDb(store, stale, {
      publish: false,
      expectedUpdatedAt: new Date(Date.now() - 86400000).toISOString(),
    });
    check("返回 conflict", !r3.ok && r3.conflict === true);
    const draftRow3 = await prisma.document.findUnique({ where: { id: draft.id } });
    check("草稿行未被过期写入覆盖", draftRow3?.content === "草稿");

    console.log("场景四：发布 v2（自动递增：清草稿 + 新快照 + published 行更新）");
    const v2 = persistDocument(store, makeBody({ content: "v2" }) as never, true, { actor: "dbtest" });
    check("版本自动递增为 2", v2.version === 2, `实际 ${v2.version}`);
    const r4 = await persistDocumentToDb(store, v2, {
      publish: true,
      expectedUpdatedAt: (await prisma.document.findUnique({ where: { id: pub.id } }))!.updatedAt.toISOString(),
    });
    check("写入成功", r4.ok);
    const pubRow4 = await prisma.document.findUnique({ where: { id: pub.id } });
    check("已发布行更新到 v2", pubRow4?.content === "v2");
    check("库中版本号为 2", pubRow4?.version === 2, `实际 ${pubRow4?.version}`);
    check("草稿行已被清除",
      (await prisma.document.findMany({ where: { productId, slug, status: "draft" } })).length === 0);
    const revs = await prisma.docRevision.findMany({ where: { docId: pub.id } });
    check("两条历史快照", revs.length === 2);

    console.log("场景五：再次发布自动递增 v3（历史按条目 id 判重追加第三条）");
    const again = persistDocument(store, makeBody({ content: "v2 修订" }) as never, true, { actor: "dbtest" });
    check("版本自动递增为 3", again.version === 3, `实际 ${again.version}`);
    const r5 = await persistDocumentToDb(store, again, {
      publish: true,
      expectedUpdatedAt: (await prisma.document.findUnique({ where: { id: pub.id } }))!.updatedAt.toISOString(),
    });
    check("写入成功", r5.ok);
    const revs5 = await prisma.docRevision.findMany({ where: { docId: pub.id } });
    check("追加第三条（按条目 id 判重，不吞历史）", revs5.length === 3, `实际 ${revs5.length}`);
    check("版本快照各不同（v1/v2/v3）", new Set(revs5.map((x) => x.version)).size === 3);
    check("条目 id 互不相同（按 id 判重）", new Set(revs5.map((x) => x.id)).size === revs5.length);
  } catch (e) {
    // 异常必须显式报出来：静默吞掉会让一次失败的验证看起来像通过
    failures++;
    console.error("✗ 测试异常（计入失败）：", e);
  } finally {
    // 清理：按 key 删本次测试的文档行，快照与挂载点随外键级联删除
    try {
      await prisma.document.deleteMany({ where: { productId, slug } });
      console.log("已清理临时数据");
    } catch (e) {
      console.error("清理失败（可能残留测试数据，可手工删 documents 里 slug 含 dbtest_ 的行）：", e);
    }
    process.exit(failures > 0 ? 1 : 0);
  }
}

main().catch((e) => {
  console.error("测试启动失败：", e);
  process.exit(1);
});
