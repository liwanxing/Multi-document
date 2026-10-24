import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(`${BASE}/api/admin/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" }),
});
const cookie = (res.headers.get("set-cookie") || "").split(";")[0];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-varbtn",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));
await page.setCookie({ name: "admin_session", value: cookie.split("=")[1], domain: "localhost", path: "/" });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 进入中广云项目管理目录 -> 管理文档 -> 编辑第一篇
await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("管理目录")); if (b) b.click(); });
await sleep(1500);
await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("管理文档")); if (b) b.click(); });
await sleep(1500);
await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "编辑"); if (b) b.click(); });
await sleep(2500);

// 检查“项目变量”区块
const sectionInfo = await page.evaluate(() => {
  const h4s = Array.from(document.querySelectorAll("h4"));
  const h = h4s.find((x) => (x.innerText || "").includes("项目变量"));
  if (!h) return null;
  const section = h.closest("section");
  const cards = Array.from(section.querySelectorAll("button"));
  return {
    header: section.querySelector(".flex")?.innerText,
    cards: cards.map((c) => c.innerText.replace(/\s+/g, " ")),
  };
});
console.log("项目变量区块:", JSON.stringify(sectionInfo, null, 1));
if (!sectionInfo) { console.log("❌ 未找到项目变量区块"); process.exit(1); }

// 点击 {{brand_name}} 卡片，检查插入
const before = await page.evaluate(() => { const t = document.querySelector("textarea"); return t ? t.value : null; });
await page.evaluate(() => {
  const h4s = Array.from(document.querySelectorAll("h4"));
  const h = h4s.find((x) => (x.innerText || "").includes("项目变量"));
  const card = Array.from(h.closest("section").querySelectorAll("button")).find((c) => (c.innerText || "").includes("brand_name"));
  if (card) card.click();
});
await sleep(800);
const after = await page.evaluate(() => { const t = document.querySelector("textarea"); return t ? t.value : null; });
const inserted = after && after.includes("{{brand_name}}") && before !== after;
console.log(inserted ? "✅ 点击变量卡片已插入 {{brand_name}}" : "❌ 变量未插入");
console.log("插入后光标附近内容:", after ? JSON.stringify(after.slice(0, 120)) : "无 textarea");
await browser.close();
process.exit(inserted ? 0 : 1);
