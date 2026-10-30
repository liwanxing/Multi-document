import puppeteer from "puppeteer-core";

// 验证组件插入位置修复：
// 1. 未碰过编辑区时，插入应追加到文末（而不是文首）
// 2. 插入后预览应出现 doc-insert-flash 高亮
// 3. 光标在中间时，插入跟随光标位置

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(`${BASE}/api/admin/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" }),
});
if (!res.ok) {
  console.log("❌ 登录失败", res.status);
  process.exit(1);
}
const cookie = (res.headers.get("set-cookie") || "").split(";")[0];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-insert",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));
await page.setCookie({ name: "admin_session", value: cookie.split("=")[1], domain: "localhost", path: "/" });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 进入有文档的项目（中广云，3 篇）-> 管理文档 -> 编辑第一篇
await page.evaluate(() => {
  const others = ["回归验证 a", "扩展验证", "回归验证 b", "大数据"];
  const btns = Array.from(document.querySelectorAll("button")).filter((x) => (x.innerText || "").includes("管理目录"));
  const target = btns.find((b) => {
    let el = b;
    for (let i = 0; i < 10 && el; i++) {
      const text = el.textContent || "";
      if (text.includes("中广云") && !others.some((o) => text.includes(o))) return true;
      el = el.parentElement;
    }
    return false;
  });
  if (target) target.click();
});
await sleep(1500);
await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").includes("管理文档")); if (b) b.click(); });
await sleep(1500);
await page.evaluate(() => { const b = Array.from(document.querySelectorAll("button")).find((x) => (x.innerText || "").trim() === "编辑"); if (b) b.click(); });
await sleep(2500);

const ta = () => page.evaluate(() => {
  const t = document.querySelector("textarea");
  return t ? { value: t.value, len: t.value.length } : null;
});

let failed = false;

// 场景 1：不碰编辑区，直接点 API Explorer 组件卡片 → 应追加到文末
const before1 = await ta();
if (!before1) { console.log("❌ 找不到编辑器 textarea"); process.exit(1); }
console.log(`插入前长度: ${before1.len}, 结尾: ${JSON.stringify(before1.value.slice(-40))}`);
await page.evaluate(() => {
  const card = Array.from(document.querySelectorAll("aside button")).find((x) => (x.innerText || "").includes("API Explorer"));
  if (card) card.click();
});
await sleep(1200);
const after1 = await ta();
const appendedAtEnd =
  after1.len > before1.len &&
  after1.value.slice(before1.len).includes(":::api-explorer") &&
  after1.value.trimEnd().endsWith(":::");
console.log(appendedAtEnd
  ? "✅ 场景1：未碰编辑区，组件已追加到文末"
  : `❌ 场景1失败。新增内容: ${JSON.stringify(after1.value.slice(before1.len, before1.len + 80))}，结尾: ${JSON.stringify(after1.value.slice(-40))}`);
if (!appendedAtEnd) failed = true;

// 预览高亮检查：点击后 2s 内预览区应出现 doc-insert-flash
const flashSeen = await page.evaluate(() => !!document.querySelector(".doc-insert-flash"));
console.log(flashSeen ? "✅ 预览区出现插入高亮" : "⚠️ 高亮已消失或未出现（可能轮询结束早于检查）");
if (!flashSeen) {
  // 再插一次组件，立刻检查
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll("aside button")).find((x) => (x.innerText || "").includes("请求参数列表"));
    if (card) card.click();
  });
  await sleep(600);
  const flashSeen2 = await page.evaluate(() => !!document.querySelector(".doc-insert-flash"));
  console.log(flashSeen2 ? "✅ 第二次插入后预览区出现高亮" : "❌ 预览区高亮未出现");
  if (!flashSeen2) failed = true;
}

// 场景 2：光标放在正文中间，再插组件 → 应插在光标处
const mid = await page.evaluate(() => {
  const t = document.querySelector("textarea");
  const pos = Math.floor(t.value.length / 2);
  // 找一个行首位置
  const lineStart = t.value.lastIndexOf("\n", pos) + 1;
  t.focus();
  t.setSelectionRange(lineStart, lineStart);
  return { lineStart, badgeCountBefore: (t.value.match(/<Badge type=/g) || []).length };
});
await sleep(200);
const badgeClicked = await page.evaluate(() => {
  const card = Array.from(document.querySelectorAll("aside button")).find((x) => (x.innerText || "").includes("状态徽章"));
  if (card) { card.click(); return true; }
  return false;
});
console.log("状态徽章卡片点击:", badgeClicked);
await sleep(1200);
const after2 = await ta();
const badgeCountAfter = (after2.value.match(/<Badge type=/g) || []).length;
const badgeIndices = [];
let searchFrom = 0;
while (true) {
  const idx = after2.value.indexOf("<Badge type=", searchFrom);
  if (idx < 0) break;
  badgeIndices.push(idx);
  searchFrom = idx + 1;
}
const insertedAtCaret = badgeCountAfter > mid.badgeCountBefore && badgeIndices.some((i) => Math.abs(i - mid.lineStart) <= 4);
console.log(insertedAtCaret
  ? `✅ 场景2：光标在中间时组件插在光标处（光标行首 ${mid.lineStart}）`
  : `❌ 场景2失败。badge 出现次数 ${mid.badgeCountBefore}→${badgeCountAfter}，各位置 ${JSON.stringify(badgeIndices)}，光标行首 ${mid.lineStart}`);
if (!insertedAtCaret) failed = true;

// 场景 3：编辑器应滚动到插入点附近
const scrollInfo = await page.evaluate(() => {
  const t = document.querySelector("textarea");
  return { scrollTop: t.scrollTop, scrollHeight: t.scrollHeight, clientHeight: t.clientHeight };
});
console.log(`编辑器滚动位置: scrollTop=${Math.round(scrollInfo.scrollTop)} / max=${Math.round(scrollInfo.scrollHeight - scrollInfo.clientHeight)}`);

await browser.close();
if (failed) process.exit(1);
console.log("全部场景通过 ✅");
