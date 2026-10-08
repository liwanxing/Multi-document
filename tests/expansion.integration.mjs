import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:4001";
let source, copy, product, doc, upload;
const ids = [];
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
async function req(path, body, method = "POST", status = 200) {
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
const adminFetch = (path, init) =>
  fetch(base + path, {
    ...init,
    headers: { ...(init?.headers || {}), Cookie: cookie },
  });
const cat = (action, data = {}) =>
  req("/api/admin/catalog", {
    projectId: source.id,
    productId: product?.id,
    action,
    ...data,
  });
try {
  source = await req("/api/admin/projects", {
    name: "扩展验证",
    slug: `expansion-${Date.now()}`,
    company: "测试公司",
    brandName: "测试品牌",
    description: "临时验证",
  });
  product = await cat("save-product", {
    name: "测试产品",
    slug: "sample",
    group: "产品类",
  });
  const parent = await cat("save-category", {
    name: "父分类",
    parentId: null,
    icon: "rocket",
  });
  const child = await cat("save-category", {
    name: "子分类",
    parentId: parent.id,
    icon: "code",
  });
  const content =
    '品牌：{{brand_name}}；公司：{{company_name}}；默认：{{missing|默认值}}\n\n## 媒体测试\n\n:::styled {"className":"qa-style","style":"padding:16px;background-color:#f5f7ff"}\n:::compare\n### 输入\n![图片](/images/product-knowledge.png)\n### 输出\n<video src="https://example.com/test.mp4" controls style="width:50%;height:auto"></video>\n:::\n:::\n\n---\n\n上标 x<sup>2</sup> 与下标 H<sub>2</sub>O';
  doc = await req("/api/admin/docs/publish", {
    productId: "library",
    slug: `expansion-doc-${Date.now()}`,
    title: "扩展功能验证",
    content,
    placements: [
      { projectId: source.id, productId: product.id, categoryId: child.id },
    ],
    description: "测试文档",
  });
  ids.push(doc.id);
  const draft = await req("/api/admin/docs/save", {
    ...doc,
    content: content + "\n\n草稿独立内容",
  });
  copy = await req("/api/admin/projects", {
    copyFrom: source.id,
    name: "扩展验证_副本",
    slug: source.slug + "-copy",
    description: "复制后简介",
  });
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.products[0].id, product.id);
  assert.notEqual(copy.products[0].categories[0].id, parent.id);
  assert.equal(
    copy.products[0].categories[1].parentId,
    copy.products[0].categories[0].id,
  );
  assert.equal(copy.products[0].categories[0].icon, "rocket");
  let lib = await req("/api/admin/library", undefined, "GET");
  const copyDoc = lib.documents.find((d) => d.projectIds.includes(copy.id));
  ids.push(copyDoc.id);
  assert.notEqual(copyDoc.id, doc.id);
  assert.ok(copyDoc.content.endsWith("草稿独立内容"));
  assert.deepEqual(copyDoc.projectIds, [copy.id]);
  let published = await req(`/api/projects/${copy.slug}`, undefined, "GET");
  assert.equal(published.documents.length, 1);
  assert.ok(!published.documents[0].content.endsWith("草稿独立内容"));
  const url = `/projects/${source.slug}/products/sample/docs/${doc.id}`;
  let html = await (await fetch(base + url)).text();
  assert.ok(html.includes("测试品牌"));
  assert.ok(html.includes("默认值"));
  assert.ok(html.includes("qa-style"));
  assert.ok(html.includes("<video"));
  assert.ok(html.includes("/images/product-knowledge.png"));
  html = await (await fetch(base + url + "?brand_name=ParamBrand")).text();
  assert.ok(html.includes("ParamBrand"));
  await cat("set-category-visibility", { categoryId: parent.id, hidden: true });
  assert.equal((await fetch(base + url)).status, 404);
  assert.equal(
    (await req(`/api/projects/${source.slug}`, undefined, "GET")).documents
      .length,
    0,
  );
  assert.equal(
    (await req(`/api/projects/${source.slug}`, undefined, "GET")).project
      .products[0].categories.length,
    0,
  );
  assert.equal(
    (await req(`/api/projects/${copy.slug}`, undefined, "GET")).documents
      .length,
    1,
  );
  await cat("set-category-visibility", {
    categoryId: parent.id,
    hidden: false,
  });
  await cat("set-document-visibility", { docId: doc.id, hidden: true });
  assert.equal((await fetch(base + url)).status, 404);
  assert.equal(
    (await fetch(base + `/api/docs/library/${doc.slug}`)).status,
    404,
  );
  await cat("set-document-visibility", { docId: doc.id, hidden: false });
  assert.equal((await fetch(base + url)).status, 200);
  await cat("set-group-visibility", {name:"产品类",hidden:true});
  assert.equal((await fetch(base+url)).status,404);
  assert.equal((await req(`/api/projects/${source.slug}`,undefined,"GET")).project.products.length,0);
  await cat("set-group-visibility", {name:"产品类",hidden:false});
  const f = new FormData();
  f.append(
    "file",
    new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }),
    "sample.pdf",
  );
  const r = await adminFetch("/api/admin/uploads", {
    method: "POST",
    body: f,
  });
  assert.equal(r.status, 200);
  upload = (await r.json()).data.url;
  assert.match(
    (await fetch(base + upload)).headers.get("content-disposition"),
    /attachment/,
  );
  console.log(
    "PASS: project deep copy with draft/published isolation, category hierarchy/icons, context/query variables, nested media, category/document visibility and attachment download",
  );
  if (process.env.KEEP_FIXTURE)
    await fs.writeFile(
      "/tmp/expansion-fixture.json",
      JSON.stringify({ source, copy, product, doc, ids, upload }),
    );
} finally {
  if (!process.env.KEEP_FIXTURE) {
    for (const id of ids) await req("/api/admin/library", { id }, "DELETE");
    for (const p of [copy, source].filter(Boolean)) {
      for (const product of p.products || [])
        await req("/api/admin/catalog", {
          projectId: p.id,
          productId: product.id,
          action: "delete-product",
        });
      if (p === source && product)
        await req("/api/admin/catalog", {
          projectId: p.id,
          productId: product.id,
          action: "delete-product",
        });
      await req("/api/admin/projects", { id: p.id }, "DELETE");
    }
    if (upload)
      await fs.rm("data/uploads/" + upload.split("/").pop(), { force: true });
  }
}
