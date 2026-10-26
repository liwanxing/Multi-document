/**
 * 跨协议复制文本。
 *
 * navigator.clipboard 只在安全上下文（https 或 localhost）下存在。
 * 内网用 http://IP 访问时它是 undefined，直接调用会抛 TypeError，
 * 表现为"点了复制就弹红色报错"，而且和浏览器剪贴板权限无关——连授权弹窗都不会出现。
 *
 * 这里统一处理：安全上下文优先用新 API，否则回退到 execCommand('copy')。
 * 调用方拿 boolean 判断是否成功，再决定提示文案。
 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 权限被拒或文档未聚焦，继续走下面的兜底
    }
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // 不能用 display:none / visibility:hidden，那样 select() 选中不到内容
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.width = "1px";
    area.style.height = "1px";
    area.style.padding = "0";
    area.style.border = "none";
    area.style.outline = "none";
    area.style.boxShadow = "none";
    area.style.background = "transparent";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
