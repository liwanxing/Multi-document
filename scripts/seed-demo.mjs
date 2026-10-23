// 演示数据种子：把 seed/demo-seed.json 灌入全新数据库
//
// 用途：Docker 全新部署后无需手工建项目，开箱即有"中广云 + 大数据"两个演示站点。
// 幂等策略：projects 表非空视为已有数据，默认跳过；设 SEED_DEMO_FORCE=1 可强制重灌。
// 开关：由 docker-compose 的 seed 服务在 SEED_DEMO=true 时调用；本地手动运行：
//   node scripts/seed-demo.mjs
//
// 说明：
// - 角色/用户不灌入：应用首次读取 store 时会自动初始化默认角色与 admin/operator 账号
// - 全部写入放在一个事务里，任一步失败整体回滚，不留半套数据
// - id 沿用种子文件中的原值（与导出时一致），挂载/修订的外键引用因此无需换算
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { createConnection } = await import("mysql2/promise");

const conn = await createConnection({
  uri: process.env.DATABASE_URL,
  charset: "utf8mb4_unicode_ci",
  multipleStatements: false,
});

// datetime(3)：ISO → 'YYYY-MM-DD HH:MM:SS.mmm'（mysql2 不接受带 T/Z 的 ISO 直插）
const dt = (v) => (typeof v === "string" ? v.replace("T", " ").replace("Z", "") : v);
// json 列：mysql2 需要字符串化后写入
const js = (v) => (v === null || v === undefined ? null : JSON.stringify(v));

async function count(table) {
  const [[r]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return r.n;
}

const existing = await count("projects");
if (existing > 0 && process.env.SEED_DEMO_FORCE !== "1") {
  console.log(`[seed] projects 表已有 ${existing} 条数据，跳过演示种子（强制重灌请设 SEED_DEMO_FORCE=1）`);
  await conn.end();
  process.exit(0);
}

const seed = JSON.parse(readFileSync(path.join(root, "seed", "demo-seed.json"), "utf-8"));

async function insertMany(table, rows) {
  if (!rows.length) return 0;
  const cols = Object.keys(rows[0]);
  const placeholders = rows.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
  const values = rows.flatMap((r) => cols.map((c) => r[c]));
  const sql = `INSERT INTO \`${table}\` (\`${cols.join("`,`")}\`) VALUES ${placeholders}`;
  await conn.query(sql, values);
  return rows.length;
}

try {
  await conn.beginTransaction();

  const n = {};
  // 外键顺序：projects → products → doc_categories → documents → doc_placements → doc_revisions
  n.projects = await insertMany(
    "projects",
    seed.projects.map((r) => ({
      id: r.id, slug: r.slug, name: r.name, description: r.description,
      company: r.company, brandName: r.brandName,
      productGroups: js(r.productGroups), hiddenProductGroups: js(r.hiddenProductGroups),
      groupIcons: js(r.groupIcons), legacyAliases: js(r.legacyAliases), customFields: js(r.customFields),
      createdAt: dt(r.createdAt), updatedAt: dt(r.updatedAt),
    }))
  );
  n.products = await insertMany(
    "products",
    seed.products.map((r) => ({
      id: r.id, projectId: r.projectId, slug: r.slug, name: r.name, description: r.description,
      group: r.group, media: js(r.media), docOrder: js(r.docOrder),
      createdAt: dt(r.createdAt), updatedAt: dt(r.updatedAt),
    }))
  );
  // doc_categories 存在自引用外键（parentId），必须先插无父级、再插子级
  const rootCats = seed.categories.filter((r) => !r.parentId);
  const childCats = seed.categories.filter((r) => r.parentId);
  n.categories =
    (await insertMany(
      "doc_categories",
      rootCats.map((r) => ({
        id: r.id, productId: r.productId, name: r.name, icon: r.icon,
        hidden: r.hidden, parentId: r.parentId,
      }))
    )) +
    (await insertMany(
      "doc_categories",
      childCats.map((r) => ({
        id: r.id, productId: r.productId, name: r.name, icon: r.icon,
        hidden: r.hidden, parentId: r.parentId,
      }))
    ));
  n.documents = await insertMany(
    "documents",
    seed.documents.map((r) => ({
      id: r.id, productId: r.productId, slug: r.slug, title: r.title, description: r.description,
      content: r.content, status: r.status, version: r.version, breadcrumbs: js(r.breadcrumbs),
      hidden: r.hidden, changeNote: r.changeNote, appearance: js(r.appearance),
      createdAt: dt(r.createdAt), updatedAt: dt(r.updatedAt),
    }))
  );
  n.placements = await insertMany(
    "doc_placements",
    seed.placements.map((r) => ({
      id: r.id, documentId: r.documentId, projectId: r.projectId,
      productId: r.productId, categoryId: r.categoryId,
    }))
  );
  n.revisions = await insertMany(
    "doc_revisions",
    seed.revisions.map((r) => ({
      id: r.id, docId: r.docId, version: r.version, title: r.title, summary: r.summary,
      changes: js(r.changes), placements: js(r.placements), content: r.content,
      appearance: js(r.appearance), baseline: r.baseline, createdBy: r.createdBy,
      publishedAt: dt(r.publishedAt),
    }))
  );

  await conn.commit();
  console.log(
    `[seed] 演示数据灌入完成：${n.projects} 项目 / ${n.products} 产品 / ${n.categories} 分类 / ${n.documents} 文档 / ${n.placements} 挂载 / ${n.revisions} 修订`
  );
} catch (err) {
  await conn.rollback();
  console.error("[seed] 灌入失败，已回滚：", err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
