// 最终回归：后台用户管理视图刷新 + 主流程复验
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
  args: ["--no-sandbox", `--user-data-dir=C:\\Windows\\Temp\\mdc-pptr-final`],
});
const page = await browser.newPage();
await page.setCookie({ name: cookieName, value: cookieValue, url: BASE });
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));

await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await sleep(1500);

// 用户管理视图
const menuItems = await page.$$(".arco-menu-item");
for (const m of menuItems) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("用户管理") || t.includes("用户与权限")) { await m.click(); break; }
}
await sleep(2000);
const onUsers = await page.evaluate(() => document.body.innerText.includes("角色") && document.body.innerText.includes("admin"));
console.log("用户管理视图:", onUsers ? "✅" : "❌");
await page.reload({ waitUntil: "networkidle0" });
await sleep(1500);
const stillUsers = await page.evaluate(() => document.body.innerText.includes("角色") && document.body.innerText.includes("admin"));
console.log("用户管理刷新后停留:", stillUsers ? "✅" : "❌");

// 用户管理 → 项目管理 切换再刷新
const menuItems2 = await page.$$(".arco-menu-item");
for (const m of menuItems2) {
  const t = await m.evaluate((el) => el.innerText);
  if (t.includes("项目管理")) { await m.click(); break; }
}
await sleep(800);
await page.reload({ waitUntil: "networkidle0" });
await sleep(1500);
const onProjects = await page.evaluate(() => document.body.innerText.includes("全部项目"));
console.log("切回项目管理刷新后停留:", onProjects ? "✅" : "❌");

// 退出登录：点头部的退出按钮，再在确认弹窗里确认
const logoutClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const b = btns.find((el) => (el.innerText || "").trim() === "退出");
  if (b) { b.click(); return true; }
  return false;
});
console.log("点击退出:", logoutClicked ? "✅" : "❌ 未找到退出按钮");
await sleep(1200);
const confirmed = await page.evaluate(() => {
  const modal = document.querySelector(".workspace-arco-modal, .arco-modal");
  if (!modal) return false;
  const ok = Array.from(modal.querySelectorAll("button")).find((el) => ["确定", "确认", "OK"].some((t) => (el.innerText || "").includes(t)));
  if (ok) { ok.click(); return true; }
  return false;
});
console.log("确认退出弹窗:", confirmed ? "✅" : "❌");
await sleep(3000);
console.log("退出后跳转登录页:", page.url().includes("/admin/login") ? "✅" : `❌ (${page.url()})`);
// 退出后再访问后台应被重定向到登录页
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
console.log("未登录访问后台重定向:", page.url().includes("/admin/login") ? "✅" : `❌ (${page.url()})`);

await browser.close();
