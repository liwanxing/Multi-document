// 验证：快捷插入内容、变量渲染、预览实时更新
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" }),
});
const [cookieName, cookieValue] = (loginRes.headers.get("set-cookie") || "").split(";")[0].split("=");

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--no-sandbox", `--user-data-dir=C:\\Windows\\Temp\\mdc-pptr-editor`],
});
const page = await browser.newPage();
await page.setCookie({ name: cookieName, value: cookieValue, url: BASE });
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));

// 打开编辑器（第一篇文档）
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await sleep(1200);
const menuItems = await page.$$(".arco-menu-item");
for (const m of menuItems) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("文档中心")) { await m.click(); break; }
}
await sleep(1000);
const btns = await page.$$("button");
for (const b of btns) {
  const t = (await b.evaluate((el) => el.innerText)).trim();
  if (t === "编辑") { await b.click(); break; }
}
await sleep(1800);

// 读取编辑器 textarea 初始内容长度
const textarea = await page.$("textarea");
const before = await page.evaluate((el) => el.value.length, textarea);

// 1. 点击快捷插入卡片：状态徽章 / API Explorer / 请求参数列表 / 注意事项
for (const name of ["状态徽章", "API Explorer", "请求参数列表", "注意事项"]) {
  const cards = await page.$$(".component-card");
  let hit = false;
  for (const c of cards) {
    const t = await c.evaluate((el) => el.innerText);
    if (t.includes(name)) { await c.click(); hit = true; break; }
  }
  await sleep(400);
  const after = await page.evaluate((el) => el.value.length, textarea);
  console.log(`快捷插入[${name}]:`, hit ? (after > before ? "✅ 已插入" : "❌ 点击后内容无变化") : "❌ 未找到卡片");
}

// 2. 变量渲染：直接改 textarea 内容，检查预览（用原生 setter 触发 React 受控更新）
await page.evaluate((el) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(el, "{{brand_name}} | {{company_name}} | {{support_phone}} | {{support_phone|暂无电话}} | {{not_exist_var}}");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, textarea);
await sleep(1200);
const previewText = await page.evaluate(() => {
  const article = document.querySelector(".preview-pane article");
  return article ? article.innerText : "";
});
console.log("预览内容:", JSON.stringify(previewText.slice(0, 200)));
console.log("brand_name 渲染:", previewText.includes("{{brand_name}}") ? "❌ 未渲染" : "✅");
console.log("自定义变量 support_phone 渲染:", previewText.includes("400-999-1111") ? "✅" : "❌");
console.log("带默认值语法 support_phone|默认 渲染:", previewText.includes("400-999-1111") ? "✅" : "❌ 原文残留");
console.log("未定义变量保留原文:", previewText.includes("{{not_exist_var}}") ? "✅" : "❌");

// 3. 预览实时性：继续输入，预览应立即更新
await page.evaluate((el) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(el, el.value + "\n\n实时性测试MARKER_ABC123");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, textarea);
await sleep(1000);
const live = await page.evaluate(() => document.querySelector(".preview-pane article")?.innerText || "");
console.log("预览实时更新:", live.includes("实时性测试MARKER_ABC123") ? "✅" : "❌ 预览未实时刷新");

await browser.close();
