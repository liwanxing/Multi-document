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
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-pmodal",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setCookie({ name: "admin_session", value: cookie.split("=")[1], domain: "localhost", path: "/" });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 进入第一个项目的“管理目录”
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("管理目录"));
  if (b) b.click();
});
await sleep(1500);

// 点“新建产品”
const clicked = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("新建产品"));
  if (b) { b.click(); return true; }
  return false;
});
if (!clicked) { console.log("❌ 未找到新建产品按钮"); process.exit(1); }
await sleep(1200);

const m = await page.evaluate(() => {
  const modal = document.querySelector(".project-form-modal");
  if (!modal) return null;
  const content = modal.querySelector(".arco-modal-content");
  const r = modal.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    bottomGap: Math.round(window.innerHeight - r.bottom),
    pct: Math.round((r.height / window.innerHeight) * 100),
    contentOv: getComputedStyle(content).overflowY,
    scrollable: content.scrollHeight > content.clientHeight,
  };
});
console.log("新建产品弹窗:", JSON.stringify(m));
if (!m) { console.log("❌ 弹窗未渲染"); process.exit(1); }
const pass = m.pct === 70 && m.top > 0 && m.bottomGap > 0 && m.contentOv === "auto";
console.log(pass ? "✅ 高度 70vh 且上下留有空隙" : `❌ 高度/位置异常 top=${m.top} pct=${m.pct} bottomGap=${m.bottomGap}`);
await page.screenshot({ path: "scripts/product-modal.png" });
await browser.close();
process.exit(pass ? 0 : 1);
