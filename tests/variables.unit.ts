import { renderVariables } from "../src/lib/variables";

const project: any = {
  id: "p1",
  slug: "p1",
  name: "中广云",
  description: "",
  updatedAt: "",
  customFields: [{ key: "support_phone", label: "电话", value: "400-999-1111" }],
};
// 没配 support_phone 的项目：共享文档里该变量应整行消失
const bare: any = {
  id: "p2",
  slug: "p2",
  name: "项目B",
  description: "",
  updatedAt: "",
  customFields: [],
};
const blank: any = {
  id: "p3",
  slug: "p3",
  name: "项目C",
  description: "",
  updatedAt: "",
  customFields: [{ key: "support_phone", label: "电话", value: "   " }],
};

const cases: Array<[string, any, string]> = [
  ["{{brand_name}}", project, "中广云"],
  ["{{company_name}}", project, "中广云"],
  ["{{support_phone}}", project, "400-999-1111"],
  ["{{support_phone|暂无}}", project, "400-999-1111"],
  ["{{empty_var|暂无}}", project, "暂无"],
  [" {{ brand_name }} ", project, " 中广云 "],
  // 无值 → 不输出内容；单独成行时整行删掉，且不留空白行
  ["{{empty_var}}", project, ""],
  ["{{not_exist|}}", project, ""],
  ["a\n\n{{support_phone}}\n\nb", bare, "a\n\nb"],
  ["{{support_phone}}", bare, ""],
  ["{{support_phone}}", blank, ""],
  // 行内变量：只去掉变量本身，同行文字保留
  ["支持{{support_phone}}能力", bare, "支持能力"],
  // 代码围栏内不删行，只做替换
  ["```\n{{support_phone}}\n```", bare, "```\n\n```"],
];

let ok = true;
for (const [src, proj, expected] of cases) {
  const out = renderVariables(src, proj);
  const pass = out === expected;
  if (!pass) ok = false;
  console.log(
    pass ? "✅" : "❌",
    JSON.stringify(src),
    "->",
    JSON.stringify(out),
    pass ? "" : `(期望 ${JSON.stringify(expected)})`,
  );
}
process.exit(ok ? 0 : 1);
