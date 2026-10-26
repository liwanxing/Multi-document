import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { safeComponentStyle } from "../src/lib/componentStyle.ts";

console.log("Testing safeComponentStyle and custom components...");

// 1. Test safeComponentStyle
const testStyle = "padding: 16px; background-color: #f5f7ff; border: 1px solid #d0e2ff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #1d2129;";
const parsed = safeComponentStyle(testStyle);

assert.equal(parsed.padding, "16px");
assert.equal(parsed.backgroundColor, "#f5f7ff");
assert.equal(parsed.border, "1px solid #d0e2ff");
assert.equal(parsed.borderRadius, "8px");
assert.equal(parsed.boxShadow, "0 4px 12px rgba(0,0,0,0.05)");
assert.equal(parsed.color, "#1d2129");
console.log("✓ safeComponentStyle correctly parses background, border, boxShadow, padding, radius, color");

// 2. Test dangerous style blocking
const maliciousStyle = "background-image: url('javascript:alert(1)'); color: red; width: expression(alert(1));";
const safeParsed = safeComponentStyle(maliciousStyle);
assert.equal(safeParsed.color, "red");
assert.equal(safeParsed.backgroundImage, undefined);
assert.equal(safeParsed.width, undefined);
console.log("✓ safeComponentStyle blocks malicious url() and expression()");

// 3. Test DocumentEditor contains custom component modal elements
const editorPath = path.resolve("src/components/admin/DocumentEditor.tsx");
const editorContent = await fs.readFile(editorPath, "utf-8");

assert.ok(editorContent.includes('label="组件描述"'), "Includes '组件描述' form item");
assert.ok(editorContent.includes('label="选择图标"'), "Includes '选择图标' form item");
assert.ok(editorContent.includes('CustomIconSelector'), "Includes CustomIconSelector component");
assert.ok(editorContent.includes('添加自定义组件'), "Includes '添加自定义组件' button");
assert.ok(editorContent.includes('自定义组件'), "Includes '自定义组件' section");
console.log("✓ DocumentEditor includes custom component description, icon selector, and management");

// 4. Test CustomIconSelector exists and works
const iconSelectorPath = path.resolve("src/components/admin/CustomIconSelector.tsx");
const iconSelectorContent = await fs.readFile(iconSelectorPath, "utf-8");
assert.ok(iconSelectorContent.includes("ICON_LIST"), "Uses ICON_LIST");
// 选择器已按设计简化为纯图标网格（无搜索/分类），不再依赖 ICON_CATEGORIES
assert.ok(!iconSelectorContent.includes("ICON_CATEGORIES"), "Icon grid stays category-free by design");
assert.ok(iconSelectorContent.includes("getIconItem"), "Resolves current icon via getIconItem");
console.log("✓ CustomIconSelector properly configured");

// 5. Test line break tool and shortcut
assert.ok(editorContent.includes('name: "换行"'), "Toolbar includes '换行'");
assert.ok(editorContent.includes("CornerDownLeft"), "Uses CornerDownLeft icon");
assert.ok(editorContent.includes('insertInline("<br />\\n")'), "Inserts <br />\\n on line break");
console.log("✓ Line break tool and shortcut verified");

// 6. Test Portal Homepage sticky header and scroll spy
const portalPath = path.resolve("src/components/ProjectPortal.tsx");
const portalContent = await fs.readFile(portalPath, "utf-8");
assert.ok(portalContent.includes("is-portal-page"), "ProjectPortal adds is-portal-page class");
assert.ok(portalContent.includes("onScroll"), "ProjectPortal includes scroll spy");
assert.ok(portalContent.includes("handleCategoryClick"), "ProjectPortal includes smooth category navigation");

const refCssPath = path.resolve("src/app/document-reference.css");
const refCssContent = await fs.readFile(refCssPath, "utf-8");
// 头部已改为常驻 sticky（不再靠 document.scrolled 类做透明度过渡），高亮交给 JS 滚动监听
assert.ok(refCssContent.includes(".is-portal-page .project-public-header"), "Portal sticky header rule exists");
assert.ok(refCssContent.includes(".is-portal-page .product-group-nav"), "Portal left sidebar is sticky");
console.log("✓ Portal homepage sticky header and sticky sidebar scroll spy verified");

console.log("\nAll custom component and editor verification tests passed successfully!");


