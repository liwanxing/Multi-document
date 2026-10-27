import assert from "node:assert/strict";
import {
  tryParsePastedTabs,
  tryParsePastedCards,
} from "../src/lib/pastedLayout.ts";

console.log("Starting pasted layout auto-detection tests...");

const lines = (text) => text.split("\n");

// 1. 火山文档复制出来的多平台代码块 → 一组自定义标签的 Tab
const tabsDoc = lines(`**macOS**

\`\`\`Bash
export ARK_API_KEY="your_api_key_here"
\`\`\`

**Linux**

\`\`\`Bash
export ARK_API_KEY="your_api_key_here"
\`\`\`

**Windows_CMD**

\`\`\`Bash
setx ARK_API_KEY "your_api_key_here"
\`\`\`

**Windows_PowerShell**

\`\`\`PowerShell
$env:ARK_API_KEY = "your_api_key_here"
\`\`\`

# 2 调用模型`);

const tabs = tryParsePastedTabs(tabsDoc, 0);
assert.ok(tabs, "多平台代码块应被识别为 Tab");
assert.equal(tabs.items.length, 4);
assert.deepEqual(
  tabs.items.map((item) => item.language),
  ["macOS", "Linux", "Windows_CMD", "Windows_PowerShell"],
);
assert.deepEqual(
  tabs.items.map((item) => item.syntax),
  ["bash", "bash", "bash", "powershell"],
);
assert.equal(tabs.items[2].code, 'setx ARK_API_KEY "your_api_key_here"');
assert.equal(tabsDoc[tabs.next], "# 2 调用模型");
console.log("✓ 多平台代码块 -> Tab，标签与后续内容均保留");

// 2. 只有一组时保持原样
assert.equal(
  tryParsePastedTabs(lines('**macOS**\n\n```Bash\nexport A=1\n```'), 0),
  null,
);
console.log("✓ 单组代码块不转换");

// 3. 中文加粗小标题 + 代码块不误判
assert.equal(
  tryParsePastedTabs(lines("**注意**\n\n```Bash\necho 1\n```\n\n**提示**\n\n```Bash\necho 2\n```"), 0),
  null,
);
console.log("✓ 中文加粗小标题不被当成 Tab 标签");

// 4. 标签与代码块之间没有围栏时不转换
assert.equal(
  tryParsePastedTabs(lines("**macOS**\n\n直接运行\n\n**Linux**\n\n直接运行"), 0),
  null,
);
console.log("✓ 无代码围栏不转换");

// 5. [Card] 占位链接 + 标题 / 短说明 三连 → 三列卡片
const cardsDoc = lines(`[Card](https://ark.volcengine.com/region:cn-beijing/docs/quick-start-beginner)

**快速入门(新手版)**

为零基础用户设计的快速入门

[文档检索 Skill](https://ark.volcengine.com/region:cn-beijing/docs/ark-document-skills#ark-docs-reader)

安装 \`ark-docs-reader\`，让 Agent 自动检索并读取最新官方文档

[Agent Plan](https://ark.volcengine.com/region:cn-beijing/docs/agent-plan-personal-get-started)

一站式智能体开发方案，快速搭建专属 AI Agent

# 1 获取并配置 API Key`);

const cards = tryParsePastedCards(cardsDoc, 0);
assert.ok(cards, "[Card] 占位 + 标题/说明应被识别为卡片");
assert.equal(cards.cols, 3);
assert.deepEqual(
  cards.items.map((item) => item.title),
  ["快速入门(新手版)", "文档检索 Skill", "Agent Plan"],
);
assert.deepEqual(
  cards.items.map((item) => item.href),
  [
    "https://ark.volcengine.com/region:cn-beijing/docs/quick-start-beginner",
    "https://ark.volcengine.com/region:cn-beijing/docs/ark-document-skills#ark-docs-reader",
    "https://ark.volcengine.com/region:cn-beijing/docs/agent-plan-personal-get-started",
  ],
);
assert.equal(cardsDoc[cards.next], "# 1 获取并配置 API Key");
console.log("✓ 占位链接 + 标题/说明 -> 卡片，跳转地址与后续内容均保留");

// 6. 单张卡片保持原样
assert.equal(
  tryParsePastedCards(
    lines("[Card](https://a.com)\n\n**快速入门**\n\n零基础教程"),
    0,
  ),
  null,
);
console.log("✓ 单张卡片不转换");

// 7. 加粗小标题 + 正文段落不当作卡片
assert.equal(
  tryParsePastedCards(
    lines("**第一步**\n\n打开控制台，在左侧导航中选择 API Key 管理并创建密钥。\n\n**第二步**\n\n回到终端执行上面的命令。"),
    0,
  ),
  null,
);
console.log("✓ 带句号的正文段落不被当成卡片说明");

// 8. 加粗标题紧跟正文（无空行）不当作卡片
assert.equal(
  tryParsePastedCards(lines("**入口**\n控制台\n\n**出口**\n终端"), 0),
  null,
);
console.log("✓ 标题与正文无空行时不转换");

// 9. 没有 [Card] 占位时，两组加粗标题不足以判定为卡片
assert.equal(
  tryParsePastedCards(lines("**步骤一**\n\n打开控制台\n\n**步骤二**\n\n点击创建"), 0),
  null,
);
console.log("✓ 无占位行时两组标题不转换");

// 10. 没有占位但三组时猜为卡片
const threeCards = tryParsePastedCards(
  lines("**第一步**\n\n打开控制台\n\n**第二步**\n\n点击创建\n\n**第三步**\n\n复制密钥"),
  0,
);
assert.ok(threeCards, "三组连续的标题 + 短说明应猜为卡片");
assert.equal(threeCards.items.length, 3);
assert.equal(threeCards.items[0].href, "");
console.log("✓ 无占位行时三组标题 + 短说明 -> 卡片");

console.log("\nAll pasted layout auto-detection tests passed successfully!");
