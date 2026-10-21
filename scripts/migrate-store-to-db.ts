// 一次性迁移：data/store.json → MySQL
// 用法：npx tsx scripts/migrate-store-to-db.ts
//
// 注意：旧 JSON 存储容忍"孤儿文档"（引用了不存在的产品），数据库有外键不容忍。
// 本脚本会跳过孤儿文档及其历史版本并打印清单——这些数据在原系统里本就不可达（无对应产品）。
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { saveStoreToDb, getStoreFromDb } from "../src/lib/dbStore";
import type { DocStoreData } from "../src/lib/dataStore";

async function main() {
  const file = path.join(process.cwd(), "data", "store.json");
  const store = JSON.parse(readFileSync(file, "utf-8")) as DocStoreData;

  console.log("源数据：", {
    项目: store.projects?.length ?? 0,
    产品: store.projects?.reduce((n, p) => n + (p.products?.length ?? 0), 0) ?? 0,
    文档: Object.keys(store.docs ?? {}).length,
    草稿: Object.keys(store.drafts ?? {}).length,
    历史版本: store.history?.length ?? 0,
    用户: store.users?.length ?? 0,
    角色: store.roles?.length ?? 0,
  });

  // 过滤孤儿文档（productId 不在任何项目产品列表中）
  const validProductIds = new Set(
    (store.projects ?? []).flatMap((p) =>
      (p.products ?? []).map((pp) => pp.id)
    )
  );
  const validDocIds = new Set<string>();
  const skippedDocs: string[] = [];
  const docs: NonNullable<DocStoreData["docs"]> = {};
  for (const [key, doc] of Object.entries(store.docs ?? {})) {
    if (validProductIds.has(doc.productId)) {
      docs[key] = doc;
      validDocIds.add(doc.id);
    } else {
      skippedDocs.push(`${key} (productId=${doc.productId})`);
    }
  }
  const skippedRevs: string[] = [];
  const history = (store.history ?? []).filter((r) => {
    const ok = validDocIds.has(r.docId);
    if (!ok) skippedRevs.push(`${r.docId} v${r.version}`);
    return ok;
  });

  if (skippedDocs.length > 0) {
    console.log("⚠️ 跳过孤儿文档（原系统不可达，不入库）：");
    for (const s of skippedDocs) console.log("   -", s);
  }
  if (skippedRevs.length > 0) {
    console.log("⚠️ 跳过孤儿文档的历史版本：", skippedRevs.join(", "));
  }

  await saveStoreToDb({ ...store, docs, history });
  console.log("写入完成，回读校验：");

  const back = await getStoreFromDb();
  console.log("回读数据：", {
    项目: back.projects?.length ?? 0,
    产品: back.projects?.reduce((n, p) => n + (p.products?.length ?? 0), 0) ?? 0,
    文档: Object.keys(back.docs ?? {}).length,
    历史版本: back.history?.length ?? 0,
    用户: back.users?.length ?? 0,
    角色: back.roles?.length ?? 0,
  });
  process.exit(0); // Prisma 连接池保活，显式退出
}

main().catch((e) => {
  console.error("迁移失败：", e);
  process.exit(1);
});
