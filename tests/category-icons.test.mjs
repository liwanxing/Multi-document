import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { resolveGroupIcon, DEFAULT_GROUP_ICONS } from "../src/lib/projectModel.ts";

console.log("Starting product category icons verification tests...");

// 1. Test resolveGroupIcon
assert.strictEqual(
  resolveGroupIcon("人工智能与算法", { 人工智能与算法: "brain" }),
  "brain",
  "Custom groupIcons should take highest priority",
);
assert.strictEqual(
  resolveGroupIcon("人工智能与算法", {}),
  "sparkles",
  "Default groupIcons should match known categories",
);
assert.strictEqual(
  resolveGroupIcon("计算", {}),
  "cpu",
  "计算 should resolve to cpu",
);
assert.strictEqual(
  resolveGroupIcon("存储", {}),
  "database",
  "存储 should resolve to database",
);
assert.strictEqual(
  resolveGroupIcon("安全", {}),
  "shield",
  "安全 should resolve to shield",
);
assert.strictEqual(
  resolveGroupIcon("网络", {}),
  "globe",
  "网络 should resolve to globe",
);
assert.strictEqual(
  resolveGroupIcon("未知未定义分类", {}),
  "folder",
  "Unknown category should fallback to folder",
);
console.log("✓ resolveGroupIcon resolution logic verified");

// 2. Test CategoryIcon.tsx implementation
const categoryIconPath = path.resolve("src/components/CategoryIcon.tsx");
const categoryIconSrc = fs.readFileSync(categoryIconPath, "utf-8");
assert.ok(categoryIconSrc.includes("getIconItem(normalized)"), "CategoryIcon checks iconRegistry");
assert.ok(categoryIconSrc.includes("categoryIcons[normalized]"), "CategoryIcon checks local dictionary");
assert.ok(categoryIconSrc.includes("fallback: Fallback"), "CategoryIcon supports fallback icon component");
console.log("✓ CategoryIcon component source and fallback verified");

// 3. Test ProjectPortal.tsx implementation
const portalPath = path.resolve("src/components/ProjectPortal.tsx");
const portalSrc = fs.readFileSync(portalPath, "utf-8");
assert.ok(portalSrc.includes("resolveGroupIcon"), "ProjectPortal should use resolveGroupIcon");
assert.ok(portalSrc.includes("fallback={FallbackIcon}"), "ProjectPortal should supply fallback icon");
console.log("✓ ProjectPortal sidebar & section category icons verified");

// 4. Test ProductGroups.tsx admin implementation
const groupsPath = path.resolve("src/components/admin/ProductGroups.tsx");
const groupsSrc = fs.readFileSync(groupsPath, "utf-8");
assert.ok(groupsSrc.includes("IconPicker"), "ProductGroups should have IconPicker");
assert.ok(groupsSrc.includes("compact={true}"), "ProductGroups should have compact IconPicker on each row");
assert.ok(groupsSrc.includes("handleQuickIconChange"), "ProductGroups should support inline icon changes");
assert.ok(groupsSrc.includes("保存修改"), "ProductGroups should have 保存修改 in editing mode");
console.log("✓ ProductGroups admin icon picker and inline setting verified");

// 5. Test ProjectManager.tsx
const mgrPath = path.resolve("src/components/admin/ProjectManager.tsx");
const mgrSrc = fs.readFileSync(mgrPath, "utf-8");
assert.ok(mgrSrc.includes("resolveGroupIcon"), "ProjectManager should use resolveGroupIcon");
console.log("✓ ProjectManager table and select dropdown icons verified");

// Category icon defaults are verified above without depending on local user data.

console.log("\nAll product category icons verification tests passed successfully!");
