// 验证：产品分类管理页的上移/下移排序（UI 层，针对“大数据”项目）
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
  args: ["--no-sandbox", `--user-data-dir=C:\\Windows\\Temp\\mdc-pptr-groups`],
});
const page = await browser.newPage();
await page.setCookie({ name: cookieName, value: cookieValue, url: BASE });
page.on("pageerror", (e) => console.log("[pageerror]", e.message.split("\n")[0]));

await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await sleep(1500);

async function groupRows() {
  return page.evaluate(() => {
    const rows = document.querySelectorAll(".groups-manager tbody tr");
    return Array.from(rows).map((row) => {
      const nameCell = row.querySelector(".arco-table-td:nth-child(2)");
      return nameCell ? nameCell.innerText.trim() : "";
    }).filter(Boolean);
  });
}
async function clickBtn(label) {
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await b.evaluate((el) => el.innerText);
    if (t.includes(label)) { await b.click(); return true; }
  }
  return false;
}

// 找到“大数据”项目卡片并点它的 管理目录
const entered = await page.evaluate(() => {
  const titleBtns = Array.from(document.querySelectorAll("button")).filter((b) => b.innerText.trim() === "大数据");
  if (!titleBtns.length) return false;
  let card = titleBtns[0];
  for (let i = 0; i < 6 && card; i++) {
    if (card.querySelector?.("button") && Array.from(card.querySelectorAll("button")).some((b) => b.innerText.includes("管理目录"))) break;
    card = card.parentElement;
  }
  const manage = Array.from(card.querySelectorAll("button")).find((b) => b.innerText.includes("管理目录"));
  if (manage) { manage.click(); return true; }
  return false;
});
await sleep(1500);
console.log("进入大数据项目管理:", entered);
await clickBtn("管理产品分类");
await sleep(1500);

console.log("body 含'产品分类管理':", await page.evaluate(() => document.body.innerText.includes("产品分类管理")));
console.log("表格 class:", await page.evaluate(() => Array.from(document.querySelectorAll("table, [class*=table]")).slice(0, 5).map((e) => e.className).join(" | ")));

const before = await groupRows();
console.log("排序前分类列表:", before);

// 第一行点“下移”
await page.click('.groups-manager tbody tr:first-child button[aria-label="下移"]');
await sleep(1500);
const after = await groupRows();
console.log("点下移后分类列表:", after);
console.log("下移生效:", JSON.stringify(before) !== JSON.stringify(after) ? "✅" : "❌");

// 刷新验证持久化
await page.reload({ waitUntil: "networkidle0" });
await sleep(2000);
const afterReload = await groupRows();
console.log("刷新后分类列表:", afterReload);
console.log("排序持久化:", JSON.stringify(afterReload) === JSON.stringify(after) ? "✅" : "❌");

// 再点“上移”还原
const hasUp = await page.$('.groups-manager tbody tr:nth-child(2) button[aria-label="上移"]');
if (hasUp) {
  await hasUp.click();
  await sleep(1500);
  console.log("还原后分类列表:", await groupRows());
}

await browser.close();
