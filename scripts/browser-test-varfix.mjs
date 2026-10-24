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
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-varfix",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));
await page.setCookie({ name: "admin_session", value: cookie.split("=")[1], domain: "localhost", path: "/" });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 进入“中广云”项目的管理目录
const entered = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("button"));
  const b = cards.find((x) => (x.innerText || "").includes("管理目录"));
  if (b) { b.click(); return true; }
  return false;
});
if (!entered) { console.log("❌ 未找到管理目录按钮"); process.exit(1); }
await sleep(1500);

// 点第一个产品的“管理文档”
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("管理文档"));
  if (b) b.click();
});
await sleep(1500);

// 点第一篇文档的“编辑”
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "编辑");
  if (b) b.click();
});
await sleep(2500);

const preview = await page.evaluate(() => {
  const pane = document.querySelector(".preview-pane");
  return pane ? pane.innerText : null;
});
if (!preview) { console.log("❌ 未找到预览面板"); process.exit(1); }
const hasZhongguang = preview.includes("中广云");
const hasBigdata = preview.includes("大数据");
console.log("预览含'中广云':", hasZhongguang, "| 含'大数据':", hasBigdata);
console.log(hasZhongguang && !hasBigdata ? "✅ 中广云项目的文档预览变量渲染正确" : "❌ 变量渲染仍错误");

// 有多项目绑定时应出现项目切换下拉
const hasSwitch = await page.evaluate(() => !!document.querySelector(".preview-pane .arco-select"));
console.log("多项目切换下拉:", hasSwitch ? "存在" : "不存在");
await browser.close();
