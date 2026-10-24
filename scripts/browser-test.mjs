// 复现/验证：后台各页面刷新后是否停留在原页面
// 用法: node scripts/browser-test.mjs [before|after]
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function currentState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || "";
    if (text.includes("实时预览") || text.includes("编辑器组件")) return "editor";
    if (text.includes("产品分类管理")) return "groups-manager";
    if (text.includes("用户与权限") || document.querySelector(".user-manager, [class*=user]"))
      if (text.includes("角色")) return "users";
    if (text.includes("文档中心") && text.includes("文档列表")) return "documents";
    if (text.includes("项目管理") && text.includes("全部项目")) return "projects";
    if (text.includes("文档目录")) return "product-docs";
    return "unknown";
  });
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  dumpio: false,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${process.env.TEMP || "C:/Windows/Temp"}\\mdc-puppeteer-profile`,
    "--disable-extensions",
    "--disable-features=msHubApps",
  ],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));

// 1. 登录：通过 API 拿会话 Cookie 再注入页面，避免受本机 Edge 实例/配置影响
const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" }),
});
if (!loginRes.ok) {
  console.log("登录接口失败", loginRes.status);
  process.exit(1);
}
const setCookie = loginRes.headers.get("set-cookie") || "";
const cookiePair = setCookie.split(";")[0];
const [cookieName, cookieValue] = cookiePair.split("=");
await page.setCookie({ name: cookieName, value: cookieValue, url: BASE });
await page.goto(`${BASE}/admin?fresh=${Date.now()}`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);
console.log("登录后:", await currentState(page));

// 2. 进入“文档中心”菜单再刷新
const menuItems = await page.$$(".arco-menu-item");
for (const m of menuItems) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("文档中心")) { await m.click(); break; }
}
await sleep(800);
console.log("切到文档中心:", await currentState(page));
await page.reload({ waitUntil: "networkidle0" });
await sleep(1200);
const s1 = await currentState(page);
console.log("文档中心刷新后:", s1, s1 === "documents" ? "✅ 停留原页" : "❌ 跳转到其他页面");

// 3. 打开一个项目的目录管理页再刷新
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await sleep(1000);
// 恢复机制会回到上次的视图，先显式切到“项目管理”
const menuItems1 = await page.$$(".arco-menu-item");
for (const m of menuItems1) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("项目管理")) { await m.click(); break; }
}
await sleep(800);
const allBtns = await page.$$("button");
for (const b of allBtns) {
  const t = await b.evaluate((el) => el.innerText);
  if (t.includes("管理目录")) { await b.click(); break; }
}
await sleep(1200);
const sBefore2 = await currentState(page);
console.log("进入项目管理:", sBefore2);
await page.reload({ waitUntil: "networkidle0" });
await sleep(1200);
const s2 = await currentState(page);
console.log("项目管理页刷新后:", s2, s2 === sBefore2 && s2 !== "projects" ? "✅ 停留原页" : "❌ 跳回项目列表");

// 3b. 进入“产品分类管理”页再刷新
if (s2 === "product-docs") {
  const btns3 = await page.$$("button");
  for (const b of btns3) {
    const t = await b.evaluate((el) => el.innerText);
    if (t.includes("管理产品分类")) { await b.click(); break; }
  }
  await sleep(1200);
  const gBefore = await currentState(page);
  console.log("进入产品分类管理:", gBefore);
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  const gAfter = await currentState(page);
  console.log("产品分类管理刷新后:", gAfter, gAfter === "groups-manager" ? "✅ 停留原页" : "❌ 跳转到其他页面");
}

// 4. 打开文档编辑器再刷新（走菜单点击，模拟真实用户路径）
const menuItems2 = await page.$$(".arco-menu-item");
for (const m of menuItems2) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("文档中心")) { await m.click(); break; }
}
await sleep(1000);
const editBtns = await page.$$("button");
for (const b of editBtns) {
  const t = await b.evaluate((el) => el.innerText);
  if (t.trim() === "编辑") { await b.click(); break; }
}
await sleep(1500);
console.log("打开编辑器:", await currentState(page));
await page.reload({ waitUntil: "networkidle0" });
await sleep(1500);
const s3 = await currentState(page);
console.log("编辑器刷新后:", s3, s3 === "editor" ? "✅ 停留编辑器" : "❌ 跳转到其他页面");

await browser.close();
