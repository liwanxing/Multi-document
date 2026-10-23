// 导出当前库中的演示数据为种子文件 seed/demo-seed.json
//
// 用途：本地把演示数据调整满意后，跑一次导出，把"最终状态"固化为种子；
// 之后 Docker 全新部署时由 scripts/seed-demo.mjs 原样灌入。
//
// 运行：node scripts/export-demo-seed.mjs
// 读取 .env 的 DATABASE_URL；角色/用户不在导出范围（应用首次读取时会自动初始化默认角色与账号）。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

// datetime(3) → ISO 字符串（保留毫秒），json 列已由 mysql2 解析为对象
const iso = (v) => (v instanceof Date ? v.toISOString() : v);

async function rows(sql) {
  const [rs] = await conn.query(sql);
  return rs;
}

const projects = (await rows("SELECT * FROM projects ORDER BY slug")).map((r) => ({
  ...r,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
}));
const products = (await rows("SELECT * FROM products ORDER BY projectId, slug")).map((r) => ({
  ...r,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
}));
const categories = (await rows("SELECT * FROM doc_categories ORDER BY productId, id")).map((r) => ({
  ...r,
}));
const documents = (await rows("SELECT * FROM documents ORDER BY id")).map((r) => ({
  ...r,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
}));
const placements = await rows("SELECT * FROM doc_placements ORDER BY documentId, projectId");
const revisions = (await rows("SELECT * FROM doc_revisions ORDER BY docId, version")).map((r) => ({
  ...r,
  publishedAt: iso(r.publishedAt),
}));

await conn.end();

const seed = { exportedAt: new Date().toISOString(), projects, products, categories, documents, placements, revisions };
mkdirSync(path.join(root, "seed"), { recursive: true });
const out = path.join(root, "seed", "demo-seed.json");
writeFileSync(out, JSON.stringify(seed, null, 2), "utf-8");

console.log(
  `已导出 ${projects.length} 项目 / ${products.length} 产品 / ${categories.length} 分类 / ${documents.length} 文档 / ${placements.length} 挂载 / ${revisions.length} 修订 → seed/demo-seed.json`
);
