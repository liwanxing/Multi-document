import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:4001";
let cookie = "";
const loginResponse = await fetch(base + "/api/admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: process.env.TEST_ADMIN_USER || "admin",
    password: process.env.TEST_ADMIN_PASS || "admin123",
  }),
});
cookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];
assert.ok(cookie, "管理员登录成功");
async function request(path, body, method = "POST", status = 200) {
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
  return j.data;
}
let project, product;
try {
  project = await request("/api/admin/projects", {
    name: "分类回归验证",
    slug: `groups-test-${Date.now()}`,
    description: "临时验证",
  });
  const action = (action, data = {}, status = 200) =>
    request(
      "/api/admin/catalog",
      { projectId: project.id, action, ...data },
      "POST",
      status,
    );
  await action("save-group", { name: "人工智能" });
  await action("save-group", { name: "存储" });
  await action("save-group", { name: "人工智能" }, 409);
  product = await action("save-product", {
    name: "验证产品",
    slug: "test",
    group: "人工智能",
  });
  const renamed = await action("save-group", {
    oldName: "人工智能",
    name: "AI 产品",
  });
  assert.equal(renamed.products[0].group, "AI 产品");
  assert.ok(renamed.productGroups.includes("存储"));
  await action("delete-group", { name: "AI 产品" }, 409);
  const saved = await request("/api/admin/projects", {
    ...project,
    name: "分类验证重命名",
  });
  assert.deepEqual(saved.productGroups, ["AI 产品", "存储"]);
  await action("save-product", {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    group: "存储",
  });
  const removed = await action("delete-group", { name: "AI 产品" });
  assert.deepEqual(removed.productGroups, ["存储"]);
  console.log(
    "PASS: empty groups, duplicate protection, rename propagation, occupied deletion protection, project save preservation and product reassignment",
  );
} finally {
  if (product)
    await request("/api/admin/catalog", {
      projectId: project.id,
      productId: product.id,
      action: "delete-product",
    });
  if (project)
    await request("/api/admin/projects", { id: project.id }, "DELETE");
}
