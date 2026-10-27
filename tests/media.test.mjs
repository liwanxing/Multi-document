import assert from "node:assert/strict";
import { sanitizeMarkup } from "../src/lib/safeMarkdown.ts";

console.log("Starting media markup tests...");

// 1. 普通图片保持 <img>
const img = sanitizeMarkup('<p><img src="https://x.com/a.png" alt="图"></p>');
assert.ok(img.includes("<img"), "png 应保持为 img");
assert.ok(!img.includes("<video"), "png 不应被换成分视频");
console.log("✓ 普通图片保持 img");

// 2. markdown 图片语法里的 .mp4 转成原生播放器
const mp4 = sanitizeMarkup('<p><img src="https://x.com/demo.mp4" alt="演示"></p>');
assert.ok(mp4.includes("<video"), "mp4 应转成 video");
assert.ok(mp4.includes('src="https://x.com/demo.mp4"'), "src 应保留");
assert.ok(mp4.includes("controls"), "应有播放控件");
assert.ok(mp4.includes('preload="metadata"'), "应预加载元数据");
console.log("✓ .mp4 图片语法 -> video 播放器");

// 3. 带查询串 / 大写后缀 / 其它视频格式
for (const src of [
  "https://x.com/a.mp4?sign=1&t=2",
  "https://x.com/A.MP4",
  "https://x.com/a.webm",
  "https://x.com/a.mov#t=3",
  "https://x.com/hls/a.m3u8",
]) {
  const html = sanitizeMarkup(`<p><img src="${src}"></p>`);
  assert.ok(html.includes("<video"), `${src} 应转成 video`);
}
console.log("✓ 查询串 / 大写后缀 / webm / mov / m3u8 均能识别");

// 4. 名称里带 mp4 但不是视频后缀的图片不能误判
for (const src of [
  "https://x.com/mp4-guide.png",
  "https://x.com/a.gif",
  "https://x.com/a.webp",
  "https://x.com/a.mp4.png",
]) {
  const html = sanitizeMarkup(`<p><img src="${src}"></p>`);
  assert.ok(html.includes("<img"), `${src} 应保持 img`);
}
console.log("✓ 非视频后缀不会被误判");

// 5. 手写的 <video> 仍然补上 controls / preload
const raw = sanitizeMarkup('<video src="https://x.com/b.mp4"></video>');
assert.ok(raw.includes("controls"), "手写 video 应自动补 controls");
assert.ok(raw.includes('preload="metadata"'), "手写 video 应自动补 preload");
console.log("✓ 手写 video 自动补 controls / preload");

// 6. 转换后仍会过滤危险协议
const danger = sanitizeMarkup('<p><img src="javascript:alert(1)/a.mp4"></p>');
assert.ok(!danger.includes("javascript:"), "危险协议应被过滤");
console.log("✓ 危险协议仍然被过滤");

// 7. 独占一段的图片 / 视频包进 figure，交给 CSS 统一限宽限高
assert.ok(img.includes('<figure class="doc-figure"><img'), "独占一段的图片应被包进 figure");
assert.ok(mp4.includes('<figure class="doc-figure"><video'), "独立的视频应被包进 figure");
console.log("✓ 独占一段的图片/视频会被包进 figure");

// 8. 与文字混排的行内小图标不能被包
const inline = sanitizeMarkup('<p>前置文字 <img src="https://x.com/icon.png"> 后置文字</p>');
assert.ok(!inline.includes("doc-figure"), "行内小图标不应被包进 figure");
console.log("✓ 行内混排图标不被包进 figure");

// 9. 带链接的图片（点击跳转）也要包
const linked = sanitizeMarkup('<p><a href="https://x.com"><img src="https://x.com/shot.png" alt="截屏"></a></p>');
assert.ok(linked.includes('<figure class="doc-figure"><a'), "带链接的独立图片应被包进 figure");
console.log("✓ 带链接的独立图片也会被包进 figure");

// 10. 独占一段的裸视频链接（从播放器旁边复制到的）直接变播放器
const bareVideo = sanitizeMarkup('<p><a href="https://x.com/edite-model.mov">https://x.com/edite-model.mov</a></p>');
assert.ok(bareVideo.includes('<figure class="doc-figure"><video'), "裸视频链接应变播放器");
assert.ok(bareVideo.includes('src="https://x.com/edite-model.mov"'), "视频地址应保留");
assert.ok(bareVideo.includes("controls"), "应有播放控件");
console.log("✓ 裸视频链接 -> 播放器");

// 11. 普通链接不能被当成视频
const bareLink = sanitizeMarkup('<p><a href="https://x.com/guide">https://x.com/guide</a></p>');
assert.ok(bareLink.includes("<a "), "普通链接应保持为链接");
assert.ok(!bareLink.includes("<video"), "普通链接不应变视频");
console.log("✓ 普通裸链接保持不变");

// 12. 无扩展名的视频源（如火山的 /obj/ 对象存储路径）也要能识别
const objVideo = sanitizeMarkup('<p><img src="https://p9-arcosite.byteimg.com/obj/tos-cn-i-goo7wpa0wc/8eaeafa52ae0" alt="视频"></p>');
assert.ok(objVideo.includes("<video"), "/obj/ 路径的视频应转成 video");
console.log("✓ 无扩展名的 /obj/ 视频源也能识别");

// 13. 同站图片（~tplv-...-image.image）不能被误判成视频
const cdnImg = sanitizeMarkup('<p><img src="https://p9-arcosite.byteimg.com/tos-cn-i-goo7wpa0wc/52bdd8074d~tplv-goo7wpa0wc-image.image" alt="图"></p>');
assert.ok(cdnImg.includes("<img"), "CDN 图片应保持 img");
assert.ok(!cdnImg.includes("<video"), "CDN 图片不应变视频");
console.log("✓ CDN 图片不被误判");

// 14. 同段多图且无文字 -> 图组网格
const gallery = sanitizeMarkup(
  '<p><img src="https://x.com/1.png"><img src="https://x.com/2.png"><img src="https://x.com/3.png"></p>',
);
assert.ok(gallery.includes('class="doc-figure-grid"'), "三张并排图应合成图组");
console.log("✓ 同段多图 -> 图组网格");

// 15. 同段图文混排不能被当图组
const mixed = sanitizeMarkup('<p>看这两张 <img src="https://x.com/1.png"> 和 <img src="https://x.com/2.png"> 的区别</p>');
assert.ok(!mixed.includes("doc-figure-grid"), "图文混排不应合成图组");
console.log("✓ 图文混排不合成图组");

// 16. 两张图分散在两个段落时保持上下排列
const stacked = sanitizeMarkup('<p><img src="https://x.com/1.png"></p><p><img src="https://x.com/2.png"></p>');
assert.ok(!stacked.includes("doc-figure-grid"), "分段图片应保持上下排列");
assert.equal(stacked.match(/doc-figure"/g).length, 2, "两张图应各自包成 figure");
console.log("✓ 分段图片保持上下排列");

console.log("\nAll media markup tests passed successfully!");
