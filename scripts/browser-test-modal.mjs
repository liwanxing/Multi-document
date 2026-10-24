import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginAndCookies() {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  return setCookie.split(";")[0];
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-modal",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const cookie = await loginAndCookies();
await page.setCookie({
  name: "admin_session",
  value: cookie.split("=")[1],
  domain: "localhost",
  path: "/",
});
await page.goto(`${BASE}/admin?view=projects`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 打开“编辑项目”弹窗
const editBtn = await page.evaluateHandle(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  return btns.find((b) => (b.getAttribute("aria-label") || "").startsWith("编辑项目")) || null;
});
const el = editBtn.asElement();
if (!el) {
  console.log("❌ 未找到编辑项目按钮");
  console.log("body片段:", (await page.evaluate(() => document.body.innerText)).slice(0, 400));
  console.log("buttons:", await page.evaluate(() => Array.from(document.querySelectorAll("button")).map(b => b.getAttribute("aria-label") || b.innerText).slice(0, 20)));
  process.exit(1);
}
await el.click();
await sleep(1200);

async function measure(tag) {
  const m = await page.evaluate(() => {
    const modal = document.querySelector(".project-form-modal");
    if (!modal) return null;
    const content = modal.querySelector(".arco-modal-content");
    const r = modal.getBoundingClientRect();
    return {
      cls: modal.className,
      kids: Array.from(modal.children).map(c => c.className).join(","),
      modalDisplay: getComputedStyle(modal).display,
      tree: (() => { const out=[]; const walk=(n,d)=>{ if(d>3) return; Array.from(n.children).forEach(c=>{ out.push("  ".repeat(d)+c.tagName+"."+(typeof c.className==="string"?c.className:"?")); walk(c,d+1); }); }; walk(modal,0); return out.slice(0,15).join(" | "); })(),
      contentOv: content ? getComputedStyle(content).overflowY : "",
      contentFlex: content ? getComputedStyle(content).flex : "",
      contentH: content ? getComputedStyle(content).height : "",
      modalH: Math.round(r.height),
      winH: window.innerHeight,
      pct: Math.round((r.height / window.innerHeight) * 100),
      contentScrollable: content ? content.scrollHeight > content.clientHeight : false,
      contentClient: content ? content.clientHeight : 0,
      contentScroll: content ? content.scrollHeight : 0,
    };
  });
  console.log(tag, JSON.stringify(m));
  return m;
}

const before = await measure("添加字段前:");
if (!before) { console.log("❌ 弹窗未渲染"); process.exit(1); }

// 连续添加 6 个字段
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".project-form-modal button"));
    const b = btns.find((x) => (x.innerText || "").includes("添加字段"));
    if (b) b.click();
  });
  await sleep(300);
}
await sleep(600);
const after = await measure("添加 6 字段后:");

await page.screenshot({ path: "scripts/modal-after-fields.png" });
const pass1 = before.pct === 70 && after.pct === 70;
const pass2 = after.contentScrollable;
console.log(pass1 ? "✅ 弹窗高度固定为视口 70%" : `❌ 弹窗高度异常: ${before.pct}% -> ${after.pct}%`);
console.log(pass2 ? "✅ 内容超高时内部滚动" : "❌ 内容未出现滚动条");
await browser.close();
process.exit(pass1 && pass2 ? 0 : 1);
