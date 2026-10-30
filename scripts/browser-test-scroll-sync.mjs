import puppeteer from "puppeteer-core";

// 分屏编辑器「左右面板滚动联动 + 插入定位」回归：
// 场景 A：光标在可视区内插入 → 编辑器不跳、预览不动、预览出现插入高亮
// 场景 B：光标在文末但视图停在顶部 → 编辑器最小位移把光标带进视野，预览按同一比例跟随
// 场景 C：滚右侧预览 → 左侧编辑器按比例跟随，且两边不来回拉扯
// 场景 D：滚左侧编辑器 → 右侧预览按比例跟随

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
  userDataDir: "C:\\Windows\\Temp\\mdc-pptr-scroll",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));
await page.setCookie({ name: "admin_session", value: cookie.split("=")[1], domain: "localhost", path: "/" });
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(1500);

// 进入“中广云”项目里有正文的那篇文档（其它项目名的卡片不能选）
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

const readScroll = () => page.evaluate(() => ({
  editor: Math.round(document.querySelector("textarea").scrollTop),
  preview: Math.round(document.querySelector(".preview-pane article").scrollTop),
  editorMax: Math.round(document.querySelector("textarea").scrollHeight - document.querySelector("textarea").clientHeight),
  previewMax: Math.round(document.querySelector(".preview-pane article").scrollHeight - document.querySelector(".preview-pane article").clientHeight),
}));

// 点组件后采样 1.4s 内两个面板的 scrollTop，返回位移序列与是否出现过插入高亮
async function sampleAfterClick(name, times = 14) {
  await page.evaluate((label) => {
    const card = Array.from(document.querySelectorAll("aside button")).find((x) => (x.innerText || "").includes(label));
    if (card) card.click();
  }, name);
  const rows = [];
  for (let i = 0; i < times; i++) {
    await sleep(100);
    rows.push(await page.evaluate(() => ({
      editor: Math.round(document.querySelector("textarea").scrollTop),
      preview: Math.round(document.querySelector(".preview-pane article").scrollTop),
      flash: !!document.querySelector(".doc-insert-flash"),
    })));
  }
  const seq = (key) => rows.map((r) => r[key]).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  return { rows, editorSeq: seq("editor"), previewSeq: seq("preview"), flash: rows.some((r) => r.flash) };
}

// ---------- 场景 A：光标在可视区内插入 ----------
// 取正文中间某个标题行，用隐藏镜像量出它的纵坐标，再把编辑器滚到能看见它
const caretA = await page.evaluate(() => {
  const t = document.querySelector("textarea");
  const heads = [...t.value.matchAll(/\n#{2,3} /g)].map((m) => m.index + 1);
  const pos = heads[Math.floor(heads.length / 2)] || Math.floor(t.value.length * 0.5);
  const style = getComputedStyle(t);
  const mirror = document.createElement("div");
  const props = ["boxSizing", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
    "letterSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "whiteSpace", "wordBreak", "overflowWrap"];
  for (const p of props) {
    mirror.style[p] = style.getPropertyValue(p.replace(/[A-Z]/g, (ch) => "-" + ch.toLowerCase()));
  }
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-10000px";
  mirror.style.width = t.clientWidth + "px";
  mirror.style.height = "auto";
  mirror.style.overflow = "hidden";
  mirror.style.visibility = "hidden";
  mirror.textContent = t.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const caretY = marker.offsetTop;
  document.body.removeChild(mirror);
  t.scrollTop = Math.max(0, caretY - 300);
  t.focus({ preventScroll: true });
  t.setSelectionRange(pos, pos);
  return { start: pos, caretY: Math.round(caretY), scrollTop: Math.round(t.scrollTop), line: t.value.slice(pos, pos + 24).split("\n")[0] };
});
await sleep(600);
const scrollA = await readScroll();
console.log(`场景A 光标在第 ${caretA.start} 字符（Y=${caretA.caretY}，视图 ${caretA.scrollTop}~）${JSON.stringify(caretA.line)}`);
const resultA = await sampleAfterClick("API Explorer");
console.log(`场景A 编辑器 ${scrollA.editor}→${resultA.editorSeq.join(",")}  预览 ${scrollA.preview}→${resultA.previewSeq.join(",")}  高亮 ${resultA.flash ? "有" : "无"}`);
const editorMovedA = Math.abs(resultA.editorSeq[resultA.editorSeq.length - 1] - scrollA.editor);
const previewMovedA = Math.abs(resultA.previewSeq[resultA.previewSeq.length - 1] - scrollA.preview);
console.log(
  editorMovedA <= 2 ? "✅ 场景A 光标可见时编辑器不跳" : `❌ 场景A 编辑器跳了 ${editorMovedA}px`,
  previewMovedA <= 8 ? `✅ 场景A 预览不动（${previewMovedA}px）` : `⚠️ 场景A 预览移动 ${previewMovedA}px`,
  resultA.previewSeq.length <= 2 ? "✅ 场景A 预览无来回跳" : `⚠️ 场景A 预览位移 ${resultA.previewSeq.length} 次`,
);

// ---------- 场景 B：光标在文末，但视图停在文档顶部 ----------
await page.evaluate(() => {
  const t = document.querySelector("textarea");
  t.focus();
  t.setSelectionRange(t.value.length, t.value.length);
  t.scrollTop = 0;
  document.querySelector(".preview-pane article").scrollTop = 0;
});
await sleep(500);
const scrollB = await readScroll();
const resultB = await sampleAfterClick("请求参数列表");
console.log(`场景B 编辑器 0→${resultB.editorSeq.join(",")}  预览 0→${resultB.previewSeq.join(",")}  高亮 ${resultB.flash ? "有" : "无"}`);
const editorB = resultB.editorSeq[resultB.editorSeq.length - 1];
console.log(
  editorB > scrollB.editor + 100 ? "✅ 场景B 编辑器把光标带进了视野" : `❌ 场景B 编辑器没滚到光标（${editorB}）`,
);
const previewB = resultB.previewSeq[resultB.previewSeq.length - 1];
console.log(
  previewB > scrollB.preview + 100 ? `✅ 场景B 预览按比例跟随（${previewB}）` : "❌ 场景B 预览没跟随",
);

// ---------- 场景 C：滚右侧预览，左侧编辑器跟随，且不来回拉扯 ----------
await sleep(1200);
const scrollC0 = await readScroll();
await page.evaluate(() => {
  const a = document.querySelector(".preview-pane article");
  a.scrollTop = (a.scrollHeight - a.clientHeight) * 0.3;
});
await sleep(500);
const scrollC1 = await readScroll();
const expectC = Math.round((scrollC1.preview / scrollC1.previewMax) * scrollC1.editorMax);
console.log(`场景C 预览滚到 30% → 预览 ${scrollC0.preview}→${scrollC1.preview}，编辑器 ${scrollC0.editor}→${scrollC1.editor}/${scrollC0.editorMax}`);
console.log(
  Math.abs(scrollC1.editor - expectC) <= 40 ? `✅ 场景C 左侧跟随预览（期望 ${expectC}）` : `❌ 场景C 左侧没跟随（期望 ${expectC}）`,
);

// 采样 1s，两边都应该稳定（不能互相推）
const stable = [];
for (let i = 0; i < 8; i++) {
  await sleep(120);
  stable.push(await readScroll());
}
const editorStable = new Set(stable.map((s) => s.editor)).size <= 1;
const previewStable = new Set(stable.map((s) => s.preview)).size <= 1;
console.log(
  editorStable && previewStable
    ? "✅ 场景C 两边稳定，无来回拉扯"
    : `❌ 场景C 两边仍在互相推：${JSON.stringify(stable.map((s) => [s.editor, s.preview]))}`,
);

// ---------- 场景 D：滚左侧编辑器，右侧预览跟随 ----------
const scrollD0 = await readScroll();
await page.evaluate(() => {
  const t = document.querySelector("textarea");
  t.scrollTop = (t.scrollHeight - t.clientHeight) * 0.6;
});
await sleep(400);
const scrollD1 = await readScroll();
const expectD = Math.round((scrollD1.editor / scrollD1.editorMax) * scrollD1.previewMax);
console.log(`场景D 编辑器滚到 60%（${scrollD1.editor}）→ 预览 ${scrollD0.preview}→${scrollD1.preview}，期望 ${expectD}`);
console.log(Math.abs(scrollD1.preview - expectD) <= 40 ? "✅ 场景D 右侧跟随编辑器" : `❌ 场景D 右侧没跟随（期望 ${expectD}）`);

await browser.close();
