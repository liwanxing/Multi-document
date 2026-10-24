import { renderVariables } from "../src/lib/variables";
const project: any = {
  id: "p1",
  slug: "p1",
  name: "中广云",
  description: "",
  updatedAt: "",
  customFields: [{ key: "support_phone", label: "电话", value: "400-999-1111" }],
};
const cases: Array<[string, string]> = [
  ["{{brand_name}}", "中广云"],
  ["{{company_name}}", "中广云"],
  ["{{support_phone}}", "400-999-1111"],
  ["{{support_phone|暂无}}", "400-999-1111"],
  ["{{empty_var|暂无}}", "暂无"],
  ["{{empty_var}}", "{{empty_var}}"],
  ["{{not_exist|}}", "{{not_exist|}}"],
  [" {{ brand_name }} ", " 中广云 "],
];
let ok = true;
for (const [src, expected] of cases) {
  const out = renderVariables(src, project);
  const pass = out === expected;
  if (!pass) ok = false;
  console.log(pass ? "✅" : "❌", JSON.stringify(src), "->", JSON.stringify(out), pass ? "" : `(期望 ${JSON.stringify(expected)})`);
}
process.exit(ok ? 0 : 1);
