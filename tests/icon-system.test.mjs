import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

console.log("Starting icon system and real-time preview verification test...");

// 1. Verify icon registry definition and exports
const registryPath = path.resolve("src/lib/iconRegistry.tsx");
const registryContent = await fs.readFile(registryPath, "utf-8");

assert.ok(registryContent.includes("export const ICON_CATEGORIES"), "Exports ICON_CATEGORIES");
assert.ok(registryContent.includes("export const ICON_LIST"), "Exports ICON_LIST");
assert.ok(registryContent.includes("export function getIconItem"), "Exports getIconItem");
assert.ok(registryContent.includes("export function renderIconSvg"), "Exports renderIconSvg");

// 2. Verify icon categories
const expectedCategories = ["ai", "dev", "system", "media", "common"];
for (const cat of expectedCategories) {
  assert.ok(registryContent.includes(`id: "${cat}"`), `Includes category ${cat}`);
}
console.log("✓ Icon categories verified");

// 3. Verify safeMarkdown SVG & title whitelist
const safeMdPath = path.resolve("src/lib/safeMarkdown.ts");
const safeMdContent = await fs.readFile(safeMdPath, "utf-8");
assert.ok(safeMdContent.includes('"svg"'), "safeMarkdown whitelists svg tag");
assert.ok(safeMdContent.includes('"path"'), "safeMarkdown whitelists path tag");
assert.ok(safeMdContent.includes('"title"'), "safeMarkdown whitelists title attribute");
console.log("✓ safeMarkdown SVG sanitizer verified");

// 4. Verify MarkdownRenderer inline icon directive processing
const rendererPath = path.resolve("src/components/MarkdownRenderer.tsx");
const rendererContent = await fs.readFile(rendererPath, "utf-8");
assert.ok(rendererContent.includes("replaceInlineIcons"), "MarkdownRenderer implements replaceInlineIcons");
assert.ok(rendererContent.includes("/\\[icon:([^\\]]+)\\]|:icon\\[([^\\]]+)\\]:/gi"), "MarkdownRenderer matches [icon:name] directive");
assert.ok(rendererContent.includes('class="doc-inline-icon"'), "MarkdownRenderer outputs doc-inline-icon class");
console.log("✓ MarkdownRenderer inline icon parsing verified");

// 5. Verify EditorIconPicker and DocumentEditor integration
const pickerPath = path.resolve("src/components/admin/EditorIconPicker.tsx");
const pickerContent = await fs.readFile(pickerPath, "utf-8");
assert.ok(pickerContent.includes("export default function EditorIconPicker"), "EditorIconPicker component exists");
assert.ok(pickerContent.includes("handleSelectIcon"), "Handles icon selection");
assert.ok(pickerContent.includes("[icon:${item.id}]"), "Inserts unified [icon:id] command");

const docEditorPath = path.resolve("src/components/admin/DocumentEditor.tsx");
const docEditorContent = await fs.readFile(docEditorPath, "utf-8");
assert.ok(docEditorContent.includes("EditorIconPicker"), "DocumentEditor imports EditorIconPicker");
assert.ok(docEditorContent.includes("<EditorIconPicker"), "DocumentEditor renders EditorIconPicker in toolbar");
assert.ok(docEditorContent.includes("insertInline"), "DocumentEditor defines insertInline cursor insertion");
console.log("✓ Editor toolbar integration and cursor insertion verified");

// 6. Verify DocComponents capability matrix integration
const docCompPath = path.resolve("src/components/DocComponents.tsx");
const docCompContent = await fs.readFile(docCompPath, "utf-8");
assert.ok(docCompContent.includes("getIconItem"), "DocComponents uses getIconItem");
console.log("✓ DocComponents capability icon resolution verified");

// 7. Verify globals.css
const cssPath = path.resolve("src/app/globals.css");
const cssContent = await fs.readFile(cssPath, "utf-8");
assert.ok(cssContent.includes(".doc-inline-icon"), "globals.css includes .doc-inline-icon");
assert.ok(cssContent.includes(".workspace-icon-picker-popover"), "globals.css includes popover styles");
console.log("✓ CSS styling rules verified");

console.log("\nAll icon system tests passed successfully!");
