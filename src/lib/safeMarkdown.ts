import sanitizeHtml from "sanitize-html";

// Markdown 只有图片语法，从文档站整段复制过来的视频通常是 `![说明](xxx.mp4)`，
// 直接当图片渲染只会得到一张破图。这里按链接判定它是不是视频。
//
// 除了后缀，还要看路径：火山文档的视频源多数长这样（完全没有扩展名）
//   https://p9-arcosite.byteimg.com/obj/tos-cn-i-goo7wpa0wc/8eaeafa5...
// 而同站的图片是 `...~tplv-goo7wpa0wc-image.image`，两者的差別就是 /obj/
// 这一段前缀，所以把常见的视频路径特征一并认上。
const VIDEO_SRC_RE = /\.(mp4|webm|ogv|mov|m4v|m3u8)(?:[?#]|$)/i;
const VIDEO_PATH_RE = /\/(?:videos?|obj)\/|\/video[-_]|byteimg\.com\/obj\//i;

function isVideoSrc(src: string): boolean {
  return VIDEO_SRC_RE.test(src) || VIDEO_PATH_RE.test(src);
}

export function sanitizeMarkup(html: string) {
  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "video",
      "source",
      "sup",
      "sub",
      "input",
      "mark",
      "kbd",
      "span",
      "svg",
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "g",
      "del",
      "s",
      "strike",
      "button",
    ],
    allowedAttributes: {
      "*": ["class", "id", "style", "title", "aria-hidden", "data-*"],
      button: ["type", "disabled", "aria-label", "title", "data-*"],
      video: ["src", "controls", "preload", "poster", "width", "height"],
      source: ["src", "type"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      input: ["type", "checked", "disabled"],
      th: ["align"],
      td: ["align"],
      svg: [
        "xmlns",
        "width",
        "height",
        "viewbox",
        "viewBox",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "aria-hidden",
      ],
      path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
      circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
      rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width"],
      line: ["x1", "y1", "x2", "y2", "stroke", "stroke-width", "stroke-linecap"],
      polyline: ["points", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin"],
      polygon: ["points", "stroke", "fill"],
      g: ["fill", "stroke"],
    },
    allowedStyles: {
      "*": {
        width: [/^(auto|\d+(\.\d+)?(px|%)?)$/],
        height: [/^(auto|\d+(\.\d+)?(px|%)?)$/],
        "font-size": [/^\d+(\.\d+)?(px|rem|em|%)$/],
        "max-width": [/^\d+(px|%)$/],
        color: [/^#[a-fA-F0-9]{3,8}$/, /^[a-z]+$/],
        "background-color": [/^#[a-fA-F0-9]{3,8}$/, /^[a-z]+$/, /^transparent$/],
        padding: [/^[\d .]+(px|rem|em|%)$/],
        "border-radius": [/^\d+(px|%)$/],
        "text-decoration": [/^[\w\s-]+$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src || "";
        if (!isVideoSrc(src)) return { tagName, attribs };
        return {
          tagName: "video",
          attribs: {
            src,
            controls: "controls",
            preload: "metadata",
            ...(attribs.title ? { title: attribs.title } : {}),
          },
        };
      },
      video: sanitizeHtml.simpleTransform("video", {
        controls: "controls",
        preload: "metadata",
      }),
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      input: sanitizeHtml.simpleTransform("input", {
        type: "checkbox",
        disabled: "disabled",
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" &&
      !!frame.attribs.src?.startsWith("data:") &&
      !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(frame.attribs.src),
  });

  // 独占一段的图片/视频包进 <figure>，交给 .doc-figure 统一限宽限高居中；
  // 与文字混排的行内小图标（badge、emoji）不满足整段只有一个媒体的条件，
  // 保持原样。
  return sanitized
    // 独占一段的裸视频链接（如从播放器旁边复制到的 https://.../x.mov）：
    // marked 会把它变成 <p><a href>...</a></p>，这里直接换成播放器。
    .replace(
      /<p>\s*<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*<\/p>/gi,
      (match, href: string) =>
        isVideoSrc(href)
          ? `<figure class="doc-figure"><video src="${href}" controls="controls" preload="metadata"></video></figure>`
          : match,
    )
    .replace(
      /<p>\s*(<video\b[^>]*>[\s\S]*?<\/video>)\s*<\/p>/gi,
      '<figure class="doc-figure">$1</figure>',
    )
    .replace(
      /<p>\s*(<img\b[^>]*>)\s*<\/p>/gi,
      '<figure class="doc-figure">$1</figure>',
    )
    .replace(
      /<p>\s*(<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>)\s*<\/p>/gi,
      '<figure class="doc-figure">$1</figure>',
    )
    // 同一段落里有多张图（原站是并排展示），且整段没有任何文字时才当图组，
    // 交给 .doc-figure-grid 排成网格；图文混排的段落原封不动。
    .replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
      const imgs = inner.match(/<img\b[^>]*>/gi) || [];
      if (imgs.length < 2) return match;
      if (inner.replace(/<[^>]+>/g, "").trim()) return match;
      return `<div class="doc-figure-grid">${inner}</div>`;
    });
}
