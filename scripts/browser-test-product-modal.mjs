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
  const wrapper = modal.closest(".arco-modal-wrapper");
  const content = modal.querySelector(".arco-modal-content");
  const r = modal.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    bottomGap: Math.round(window.innerHeight - r.bottom),
    pct: Math.round((r.height / window.innerHeight) * 100),
    contentOv: getComputedStyle(content).overflowY,
    scrollable: content.scrollHeight > content.clientHeight,
    wrapperCanScroll: wrapper ? wrapper.scrollHeight > wrapper.clientHeight : null,
    wrapperDisplay: wrapper ? getComputedStyle(wrapper).display : "",
    wrapperAlign: wrapper ? getComputedStyle(wrapper).alignItems : "",
    wrapperOv: wrapper ? getComputedStyle(wrapper).overflowY : "",
    parentChain: (() => { let n = modal, out = []; for (let i = 0; i < 4 && n; i++) { out.push(n.className || n.tagName); n = n.parentElement; } return out.join(" <= "); })(),
  };
});
console.log("新建产品弹窗:", JSON.stringify(m));
if (!m) { console.log("❌ 弹窗未渲染"); process.exit(1); }

// 滚动测试：滚轮滚动后弹窗位置不应变化
const posBefore = await page.evaluate(() => {
  const w = document.querySelector(".arco-modal-wrapper");
  const modal = document.querySelector(".project-form-modal");
  return { scrollTop: w ? w.scrollTop : -1, top: Math.round(modal.getBoundingClientRect().top) };
});
await page.mouse.move(400, 300);
await page.mouse.wheel({ deltaY: 300 });
await sleep(500);
const posAfter = await page.evaluate(() => {
  const w = document.querySelector(".arco-modal-wrapper");
  const modal = document.querySelector(".project-form-modal");
  return { scrollTop: w ? w.scrollTop : -1, top: Math.round(modal.getBoundingClientRect().top) };
});
const noSlide = posBefore.top === posAfter.top && posBefore.scrollTop === posAfter.scrollTop;
console.log(noSlide ? "✅ 滚动时弹窗不滑动" : `❌ 弹窗随滚动移动: ${JSON.stringify(posBefore)} -> ${JSON.stringify(posAfter)}`);

const pass = m.pct === 70 && m.top > 0 && m.bottomGap > 0 && m.contentOv === "auto" && m.wrapperCanScroll === false && noSlide;
console.log(pass ? "✅ 全部通过" : "❌ 存在问题");
await page.screenshot({ path: "scripts/product-modal.png" });
await browser.close();
process.exit(pass ? 0 : 1);
