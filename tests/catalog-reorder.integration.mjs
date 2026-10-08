import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:4000";
const stamp = Date.now();
let checks = 0;
let cookie = "";
async function req(path, method = "GET", body, status = 200) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json();
  assert.equal(r.status, status, JSON.stringify(j));
  checks++;
  return j.data;
}
const loginResponse = await fetch(base + "/api/admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: process.env.TEST_ADMIN_USER || "admin",
    password: process.env.TEST_ADMIN_PASS || "admin123",
  }),
});
cookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];
assert.equal(loginResponse.status, 200, "管理员登录成功");
assert.ok(cookie.startsWith("admin_session="), "取得后台会话");
const catalog = (p, action, body = {}, status = 200) =>
  req("/api/admin/catalog", "POST", { projectId: p.id, action, ...body }, status);
const docs = [];
let project;
let product;
try {
  project = await req("/api/admin/projects", "POST", {
    name: `排序验证 ${stamp}`,
    slug: `qa-order-${stamp}`,
    description: "测试后清理",
    company: "测试公司",
  });
  product = await catalog(project, "save-product", {
    name: "排序产品",
    slug: "order-product",
    group: "测试分组",
  });
  const category = await catalog(project, "save-category", {
    productId: product.id,
    name: "排序分类",
    parentId: null,
  });
  const place = {
    projectId: project.id,
    productId: product.id,
    categoryId: category.id,
  };
  for (const [i, slug] of [
    `qa-doc-a-${stamp}`,
    `qa-doc-b-${stamp}`,
    `qa-doc-c-${stamp}`,
  ].entries()) {
    const doc = await req("/api/admin/docs/save", "POST", {
      productId: "library",
      slug,
      title: `排序文档 ${i}`,
      content: `ORDER_${i}`,
      placements: [place],
    });
    await req("/api/admin/docs/publish", "POST", doc);
    docs.push(doc.id);
  }
  const publicOrder = () =>
    req(`/api/projects/${project.slug}?product=order-product`).then((d) =>
      d.documents.map((x) => x.id),
    );
  assert.deepEqual(await publicOrder(), docs, "初始顺序为创建顺序");

  await catalog(project, "reorder-document", {
    productId: product.id,
    categoryId: category.id,
    docId: docs[2],
    offset: -1,
  });
  assert.deepEqual(
    await publicOrder(),
    [docs[0], docs[2], docs[1]],
    "分类内上移生效并同步前台",
  );

  await catalog(project, "reorder-document", {
    productId: product.id,
    docId: docs[0],
    offset: 1,
  });
  assert.deepEqual(
    await publicOrder(),
    [docs[2], docs[0], docs[1]],
    "全部文档视图下移生效",
  );

  await catalog(project, "reorder-document", {
    productId: product.id,
    categoryId: category.id,
    docId: docs[2],
    offset: -1,
  });
  assert.deepEqual(await publicOrder(), [docs[2], docs[0], docs[1]], "已在顶部时上移不变化");

  await catalog(
    project,
    "reorder-document",
    {
      productId: product.id,
      categoryId: category.id,
      docId: docs[0],
      offset: 2,
    },
    400,
  );
  await catalog(
    project,
    "reorder-document",
    {
      productId: product.id,
      categoryId: category.id,
      docId: "not-a-doc",
      offset: 1,
    },
    404,
  );

  const library = await req("/api/admin/library");
  assert.deepEqual(
    library.documents
      .filter((d) => docs.includes(d.id))
      .map((d) => d.id)
      .sort(),
    [...docs].sort(),
    "后台文档库包含全部测试文档",
  );
  console.log(`PASS: ${checks} catalog reorder API checks.`);
} finally {
  for (const id of docs) await req("/api/admin/library", "DELETE", { id });
  if (project) {
    if (product)
      await catalog(project, "delete-product", { productId: product.id });
    await req("/api/admin/projects", "DELETE", { id: project.id });
  }
  console.log("Test fixtures removed.");
}
