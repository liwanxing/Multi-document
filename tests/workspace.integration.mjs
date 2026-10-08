import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:4001";
const stamp = Date.now(),
  projects = [],
  docs = [];
let checks = 0;
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
const catalog = (p, action, body = {}, status = 200) =>
  req(
    "/api/admin/catalog",
    "POST",
    { projectId: p.id, action, ...body },
    status,
  );
try {
  const original = await req("/api/admin/library");
  for (const suffix of ["a", "b", "c"]) {
    const p = await req("/api/admin/projects", "POST", {
      name: `验证项目 ${suffix}`,
      slug: `qa-${stamp}-${suffix}`,
      description: "测试后清理",
      company: `公司 ${suffix}`,
    });
    projects.push(p);
    p.product = await catalog(p, "save-product", {
      name: "同款产品",
      slug: "same-product",
      group: "测试分组",
    });
    p.category = await catalog(p, "save-category", {
      productId: p.product.id,
      name: "一级分类",
      parentId: null,
    });
    p.child = await catalog(p, "save-category", {
      productId: p.product.id,
      name: "二级分类",
      parentId: p.category.id,
    });
  }
  const [a, b, c] = projects;
  const place = (p) => ({
    projectId: p.id,
    productId: p.product.id,
    categoryId: p.child.id,
  });
  await catalog(a, "save-product", { name: "重复", slug: "same-product" }, 409);
  await catalog(
    a,
    "save-category",
    {
      productId: a.product.id,
      categoryId: a.category.id,
      name: "循环",
      parentId: a.child.id,
    },
    400,
  );
  await catalog(
    a,
    "delete-category",
    { productId: a.product.id, categoryId: a.category.id },
    409,
  );
  const input = {
    productId: "library",
    slug: `qa-${stamp}`,
    title: "共享指南",
    description: "摘要",
    content: "PUBLIC_V1",
    placements: [place(a), place(b)],
    appearance: { theme: "forest", density: "compact" },
  };
  await req("/api/admin/docs/save", "POST", { ...input, placements: [] }, 400);
  let doc = await req("/api/admin/docs/save", "POST", input);
  docs.push(doc.id);
  assert.equal(
    (await req(`/api/projects/${a.slug}?product=same-product`)).documents
      .length,
    0,
  );
  doc = await req("/api/admin/docs/publish", "POST", doc);
  assert.equal(doc.version, 1);
  const publicData = (p) => req(`/api/projects/${p.slug}?product=same-product`);
  assert.equal((await publicData(a)).history.length, 1);
  for (const p of [a, b]) {
    const r = await fetch(
      `${base}/projects/${p.slug}/products/same-product/docs/${doc.id}`,
    );
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes("PUBLIC_V1"));
  }
  assert.equal(
    (
      await fetch(
        `${base}/projects/${c.slug}/products/same-product/docs/${doc.id}`,
      )
    ).status,
    404,
  );
  await catalog(
    a,
    "delete-category",
    { productId: a.product.id, categoryId: a.child.id },
    409,
  );
  await catalog(a, "delete-product", { productId: a.product.id }, 409);
  let draft = await req("/api/admin/docs/save", "POST", {
    ...doc,
    content: "PRIVATE_DRAFT_V2",
    changeNote: "补充操作步骤",
  });
  await req("/api/admin/docs/save", "POST", { ...doc, content: "STALE" }, 409);
  assert.equal((await publicData(a)).documents[0].content, "PUBLIC_V1");
  assert.equal((await publicData(a)).history.length, 1);
  draft = await req("/api/admin/bindings", "POST", {
    action: "bind",
    docId: doc.id,
    ...place(c),
  });
  assert.equal((await publicData(c)).documents[0].content, "PUBLIC_V1");
  assert.equal((await publicData(c)).history[0].content, "PUBLIC_V1");
  assert.equal(draft.content, "PRIVATE_DRAFT_V2");
  doc = await req("/api/admin/docs/publish", "POST", draft);
  assert.equal(doc.version, 1, "Repeated publishing must preserve the version");
  const history = (await publicData(a)).history;
  assert.equal(history[0].summary, "补充操作步骤");
  assert.equal(history[1].content, "PUBLIC_V1");
  draft = await req("/api/admin/docs/save", "POST", { ...doc, version: 7 });
  assert.equal(draft.version, 7, "Manual version changes must survive draft saves");
  assert.equal((await publicData(a)).documents[0].version, 1);
  doc = await req("/api/admin/docs/publish", "POST", draft);
  assert.equal(doc.version, 7);
  assert.equal((await publicData(a)).history[0].version, 7);
  const { version: omittedVersion, ...withoutVersion } = doc;
  doc = await req("/api/admin/docs/publish", "POST", withoutVersion);
  assert.equal(doc.version, 7, "Omitted versions must retain the existing version");
  for (const version of [-1, 1.5, "2", null, Number.MAX_SAFE_INTEGER + 1]) {
    await req("/api/admin/docs/save", "POST", { ...doc, version }, 400);
    await req("/api/admin/docs/publish", "POST", { ...doc, version }, 400);
  }
  const privateDoc = await req("/api/admin/docs/publish", "POST", {
    ...input,
    slug: `qa-private-${stamp}`,
    title: "公司 A 专属协议",
    content: "A_ONLY",
    placements: [place(a)],
  });
  docs.push(privateDoc.id);
  assert.ok(
    !(await publicData(b)).documents.some((d) => d.id === privateDoc.id),
  );
  assert.ok(
    !(await publicData(b)).history.some((d) => d.docId === privateDoc.id),
  );
  assert.equal(
    (
      await fetch(
        `${base}/projects/${b.slug}/products/same-product/docs/${privateDoc.id}`,
      )
    ).status,
    404,
  );
  await req(
    "/api/admin/bindings",
    "POST",
    { action: "unbind", docId: privateDoc.id, ...place(a) },
    409,
  );
  await req("/api/admin/bindings", "POST", {
    action: "unbind",
    docId: doc.id,
    ...place(c),
  });
  assert.equal((await publicData(c)).history.length, 0);
  const updated = await req("/api/admin/library");
  for (const existing of original.documents)
    assert.deepEqual(
      updated.documents.find((d) => d.id === existing.id),
      existing,
      "已有文档与草稿不变",
    );
  console.log(
    `PASS: ${checks} API checks plus SSR access, hierarchy, shared/private docs, draft isolation, revision snapshots, conflict and deletion protection, existing data preservation.`,
  );
} finally {
  for (const id of docs) await req("/api/admin/library", "DELETE", { id });
  for (const p of projects) {
    if (p.product)
      await catalog(p, "delete-product", { productId: p.product.id });
    await req("/api/admin/projects", "DELETE", { id: p.id });
  }
  console.log("Test fixtures removed.");
}
