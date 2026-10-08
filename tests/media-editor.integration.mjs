import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:4001";
let count = 0;
const created = { projects: [], docs: [], uploads: [] };
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
      "content-type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json();
  assert.equal(r.status, status, JSON.stringify(j));
  count++;
  return j.data;
}
const adminFetch = (path, init) =>
  fetch(base + path, {
    ...init,
    headers: { ...(init?.headers || {}), Cookie: cookie },
  });
const cat = (p, action, body) =>
  req("/api/admin/catalog", { projectId: p.id, action, ...body });
try {
  const form = new FormData();
  form.append(
    "file",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "test.png",
  );
  const response = await adminFetch("/api/admin/uploads", {
    method: "POST",
    body: form,
  });
  assert.equal(response.status, 200);
  const uploaded = (await response.json()).data;
  created.uploads.push(uploaded.url);
  assert.match(uploaded.url, /^\/api\/media\/.*\.png$/);
  const media = await fetch(base + uploaded.url);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");
  const bytes = await media.arrayBuffer();
  assert.ok(bytes.byteLength > 20);
  const partial = await fetch(base + uploaded.url, {
    headers: { Range: "bytes=0-7" },
  });
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 8);
  assert.equal(
    (await fetch(base + uploaded.url, { headers: { Range: "bytes=99999-" } }))
      .status,
    416,
  );
  const invalid = new FormData();
  invalid.append(
    "file",
    new Blob(["not an image"], { type: "image/png" }),
    "fake.png",
  );
  assert.equal(
    (
      await adminFetch("/api/admin/uploads", {
        method: "POST",
        body: invalid,
      })
    ).status,
    400,
  );
  for (const suffix of ["a", "b"]) {
    const p = await req("/api/admin/projects", {
      name: "回归验证 " + suffix,
      slug: "media-qa-" + Date.now() + suffix,
      description: "自动测试",
    });
    created.projects.push(p);
    p.product = await cat(p, "save-product", {
      name: "媒体产品",
      slug: "media-product",
      media: { url: uploaded.url, type: "image" },
    });
    p.first = await cat(p, "save-category", {
      productId: p.product.id,
      name: "入门",
      parentId: null,
    });
    p.second = await cat(p, "save-category", {
      productId: p.product.id,
      name: "进阶",
      parentId: null,
    });
  }
  const [a, b] = created.projects;
  const place = (p) => ({
    projectId: p.id,
    productId: p.product.id,
    categoryId: p.first.id,
  });
  let doc = await req("/api/admin/docs/publish", {
    title: "编辑体验验证",
    productId: "library",
    slug: "media-qa-" + Date.now(),
    content: `## 示例\n\n![上传图片](${uploaded.url})\n\n> 引用文字\n\n| 参数 | 说明 |\n| --- | --- |\n| name | 测试 |`,
    placements: [place(a), place(b)],
  });
  created.docs.push(doc.id);
  await req("/api/admin/docs/save", {
    ...doc,
    content: doc.content + "\n\n未发布草稿",
  });
  const moved = await req("/api/admin/bindings", {
    action: "move",
    docId: doc.id,
    projectId: a.id,
    productId: a.product.id,
    fromCategoryId: a.first.id,
    categoryId: a.second.id,
  });
  assert.ok(moved.content.includes("未发布草稿"));
  assert.ok(
    moved.placements.some(
      (p) => p.projectId === a.id && p.categoryId === a.second.id,
    ),
  );
  assert.ok(
    moved.placements.some(
      (p) => p.projectId === b.id && p.categoryId === b.first.id,
    ),
  );
  const published = await req("/api/projects/" + a.slug, null, "GET");
  assert.ok(!published.documents[0].content.includes("未发布草稿"));
  assert.equal(published.project.products[0].media.url, uploaded.url);
  assert.equal(
    published.documents[0].placements.find((p) => p.projectId === a.id)
      .categoryId,
    a.second.id,
  );
  await req(
    "/api/admin/bindings",
    {
      action: "move",
      docId: doc.id,
      projectId: a.id,
      productId: a.product.id,
      categoryId: "missing",
    },
    "POST",
    400,
  );
  const result = await cat(a, "save-product", {
    productId: a.product.id,
    name: a.product.name,
    slug: a.product.slug,
    media: null,
  });
  assert.equal(result.media, undefined);
  console.log(
    `PASS: ${count} requests + image upload, signature validation, media range, product media persistence/removal, category move, shared binding and draft preservation.`,
  );
} finally {
  for (const id of created.docs)
    await req("/api/admin/library", { id }, "DELETE");
  for (const p of created.projects) {
    if (p.product) await cat(p, "delete-product", { productId: p.product.id });
    await req("/api/admin/projects", { id: p.id }, "DELETE");
  }
  for (const url of created.uploads)
    await fs.unlink("data/uploads/" + url.split("/").pop());
}
