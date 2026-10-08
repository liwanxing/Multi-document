import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

console.log("Starting editor components verification test...");

// 1. Verify editor.ts definition
const editorTsPath = path.resolve("src/lib/editor.ts");
const editorContent = await fs.readFile(editorTsPath, "utf-8");

const requiredComponentIds = [
  "cards",
  "features",
  "prompt-preview",
  "video-grid",
  "multimodal",
  "storyboard",
  "keyframes",
  "file",
  "banner-cards",
  "capabilities",
  "pro-table",
  "api-explorer",
  "api-params",
];

for (const id of requiredComponentIds) {
  assert.ok(
    editorContent.includes(`id: "${id}"`),
    `editor.ts must include component id "${id}"`
  );
}

console.log(`✓ All ${requiredComponentIds.length} component IDs present in src/lib/editor.ts`);

// Verify groups
assert.ok(editorContent.includes(`group: "卡片与导航"`), "Includes '卡片与导航' group");
assert.ok(editorContent.includes(`group: "AI与多模态"`), "Includes 'AI与多模态' group");
assert.ok(editorContent.includes(`group: "技术内容"`), "Includes '技术内容' group");

// 2. Verify DocumentEditor icon mappings and group list
const docEditorPath = path.resolve("src/components/admin/DocumentEditor.tsx");
const docEditorContent = await fs.readFile(docEditorPath, "utf-8");

assert.ok(docEditorContent.includes("cards: LayoutGrid"), "DocumentEditor maps cards icon");
assert.ok(docEditorContent.includes("sparkles: Sparkles"), "DocumentEditor maps sparkles icon");
assert.ok(docEditorContent.includes("split: SplitSquareVertical"), "DocumentEditor maps split icon");
assert.ok(docEditorContent.includes("video: Film"), "DocumentEditor maps video icon");
assert.ok(docEditorContent.includes("layers: Layers"), "DocumentEditor maps layers icon");
assert.ok(docEditorContent.includes("storyboard: Clapperboard"), "DocumentEditor maps storyboard icon");
assert.ok(docEditorContent.includes("keyframes: Images"), "DocumentEditor maps keyframes icon");
assert.ok(docEditorContent.includes("file: FileDown"), "DocumentEditor maps file icon");
assert.ok(docEditorContent.includes("presentation: Presentation"), "DocumentEditor maps presentation icon");
assert.ok(docEditorContent.includes("grid: Grid2X2"), "DocumentEditor maps grid icon");
assert.ok(docEditorContent.includes('"table-pro": TableProperties'), "DocumentEditor maps table-pro icon");
assert.ok(docEditorContent.includes('"api-explorer": SatelliteDish'), "DocumentEditor maps api-explorer icon");
assert.ok(docEditorContent.includes('"api-params": ListTree'), "DocumentEditor maps api-params icon");

assert.ok(docEditorContent.includes('"卡片与导航"'), "DocumentEditor lists '卡片与导航'");
assert.ok(docEditorContent.includes('"AI与多模态"'), "DocumentEditor lists 'AI与多模态'");
console.log("✓ DocumentEditor.tsx icon mappings and group display verified");

// 3. Verify DocComponents.tsx exports
const docCompPath = path.resolve("src/components/DocComponents.tsx");
const docCompContent = await fs.readFile(docCompPath, "utf-8");

assert.ok(docCompContent.includes("export function DocCards"), "Exports DocCards");
assert.ok(docCompContent.includes("export function DocFeatures"), "Exports DocFeatures");
assert.ok(docCompContent.includes("export function DocPromptPreview"), "Exports DocPromptPreview");
assert.ok(docCompContent.includes("export function DocVideoGrid"), "Exports DocVideoGrid");
assert.ok(docCompContent.includes("export function DocMultimodal"), "Exports DocMultimodal");
assert.ok(docCompContent.includes("export function DocStoryboard"), "Exports DocStoryboard");
assert.ok(docCompContent.includes("export function DocKeyframes"), "Exports DocKeyframes");
assert.ok(docCompContent.includes("export function DocFileAttachment"), "Exports DocFileAttachment");
assert.ok(docCompContent.includes("export function DocBannerCards"), "Exports DocBannerCards");
assert.ok(docCompContent.includes("export function DocCapabilities"), "Exports DocCapabilities");
assert.ok(docCompContent.includes("export function DocProTable"), "Exports DocProTable");
assert.ok(docCompContent.includes("export function DocApiExplorer"), "Exports DocApiExplorer");
assert.ok(docCompContent.includes("export function DocApiParams"), "Exports DocApiParams");
console.log("✓ DocComponents.tsx component exports verified");

// 4. Verify MarkdownRenderer.tsx handles all container directives
const rendererPath = path.resolve("src/components/MarkdownRenderer.tsx");
const rendererContent = await fs.readFile(rendererPath, "utf-8");

assert.ok(rendererContent.includes('line.trim().startsWith(":::cards")'), "Parses :::cards");
assert.ok(rendererContent.includes('line.trim().startsWith(":::features")'), "Parses :::features");
assert.ok(rendererContent.includes('line.trim().startsWith(":::prompt-preview")'), "Parses :::prompt-preview");
assert.ok(rendererContent.includes('line.trim().startsWith(":::video-grid")'), "Parses :::video-grid");
assert.ok(rendererContent.includes('line.trim().startsWith(":::multimodal")'), "Parses :::multimodal");
assert.ok(rendererContent.includes('line.trim().startsWith(":::storyboard")'), "Parses :::storyboard");
assert.ok(rendererContent.includes('line.trim().startsWith(":::keyframes")'), "Parses :::keyframes");
assert.ok(rendererContent.includes('line.trim().startsWith(":::file")'), "Parses :::file");
assert.ok(rendererContent.includes('line.trim().startsWith(":::banner-cards")'), "Parses :::banner-cards");
assert.ok(rendererContent.includes('line.trim().startsWith(":::capabilities")'), "Parses :::capabilities");
assert.ok(rendererContent.includes('line.trim().startsWith(":::pro-table")'), "Parses :::pro-table");
assert.ok(rendererContent.includes('line.trim().startsWith(":::api-explorer")'), "Parses :::api-explorer");
assert.ok(rendererContent.includes('line.trim().startsWith(":::api-params")'), "Parses :::api-params");

assert.ok(rendererContent.includes('<DocCards'), "Renders DocCards in JSX");
assert.ok(rendererContent.includes('<DocFeatures'), "Renders DocFeatures in JSX");
assert.ok(rendererContent.includes('<DocPromptPreview'), "Renders DocPromptPreview in JSX");
assert.ok(rendererContent.includes('<DocVideoGrid'), "Renders DocVideoGrid in JSX");
assert.ok(rendererContent.includes('<DocMultimodal'), "Renders DocMultimodal in JSX");
assert.ok(rendererContent.includes('<DocStoryboard'), "Renders DocStoryboard in JSX");
assert.ok(rendererContent.includes('<DocKeyframes'), "Renders DocKeyframes in JSX");
assert.ok(rendererContent.includes('<DocFileAttachment'), "Renders DocFileAttachment in JSX");
assert.ok(rendererContent.includes('<DocBannerCards'), "Renders DocBannerCards in JSX");
assert.ok(rendererContent.includes('<DocCapabilities'), "Renders DocCapabilities in JSX");
assert.ok(rendererContent.includes('<DocProTable'), "Renders DocProTable in JSX");
assert.ok(rendererContent.includes('<DocApiExplorer'), "Renders DocApiExplorer in JSX");
assert.ok(rendererContent.includes('<DocApiParams'), "Renders DocApiParams in JSX");
assert.ok(rendererContent.includes("descriptionNode:"), "Passes nested descriptionNode to DocApiParams");
assert.ok(rendererContent.includes("descriptionRaw ?"), "Uses descriptionRaw with MarkdownRenderer for nested components");
console.log("✓ MarkdownRenderer.tsx container directives and JSX rendering verified");

// 5. Verify globals.css contains matching styles
const cssPath = path.resolve("src/app/globals.css");
const cssContent = await fs.readFile(cssPath, "utf-8");

assert.ok(cssContent.includes(".doc-cards-grid"), "Contains .doc-cards-grid");
assert.ok(cssContent.includes(".doc-features-grid"), "Contains .doc-features-grid");
assert.ok(cssContent.includes(".doc-prompt-preview"), "Contains .doc-prompt-preview");
assert.ok(cssContent.includes(".doc-video-grid"), "Contains .doc-video-grid");
assert.ok(cssContent.includes(".doc-multimodal"), "Contains .doc-multimodal");
assert.ok(cssContent.includes(".doc-storyboard"), "Contains .doc-storyboard");
assert.ok(cssContent.includes(".doc-keyframes"), "Contains .doc-keyframes");
assert.ok(cssContent.includes(".doc-file-card"), "Contains .doc-file-card");
assert.ok(cssContent.includes(".doc-banner-cards-grid"), "Contains .doc-banner-cards-grid");
assert.ok(cssContent.includes(".doc-capabilities-wrapper"), "Contains .doc-capabilities-wrapper");
assert.ok(cssContent.includes(".doc-pro-table-wrapper"), "Contains .doc-pro-table-wrapper");
assert.ok(cssContent.includes(".doc-api-explorer-card"), "Contains .doc-api-explorer-card");
assert.ok(cssContent.includes(".doc-api-params"), "Contains .doc-api-params");
assert.ok(cssContent.includes(".doc-api-param-desc .doc-markdown"), "Contains nested markdown styles for api-param-desc");
console.log("✓ globals.css contains all component styling rules");

// 6. Verify DocComponents.tsx interface supports nested rendering
const docComponentsPath = path.resolve("src/components/DocComponents.tsx");
const docComponentsContent = await fs.readFile(docComponentsPath, "utf-8");
assert.ok(docComponentsContent.includes("descriptionRaw?: string;"), "ApiParamItem has descriptionRaw");
assert.ok(docComponentsContent.includes("descriptionNode?: React.ReactNode;"), "ApiParamItem has descriptionNode");
assert.ok(docComponentsContent.includes("item.descriptionNode"), "DocApiParams renders descriptionNode");
console.log("✓ DocComponents.tsx nested component interfaces and rendering verified");

console.log("\nAll 14 component verification tests passed successfully!");
