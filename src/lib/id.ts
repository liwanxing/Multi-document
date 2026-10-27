/**
 * 浏览器端生成唯一 ID。
 *
 * crypto.randomUUID 只在安全上下文（https 或 localhost）下存在。
 * 站点常用 http://IP:端口 访问，此时它是 undefined，直接调用会抛 TypeError，
 * 而错误发生在 React 事件处理器里，页面不会有任何变化——
 * 表现为"点了新建文档没反应"。
 *
 * crypto.getRandomValues 不受安全上下文限制，因此这里优先用 randomUUID，
 * 不可用时手工拼一个 v4 UUID，最后再退化到时间戳 + 随机数。
 */
export function createId(): string {
  const webCrypto =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (webCrypto?.randomUUID) return webCrypto.randomUUID();

  if (webCrypto?.getRandomValues) {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    // 按 RFC 4122 打上 v4 与 variant 标记
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex: string[] = [];
    for (let i = 0; i < bytes.length; i += 1)
      hex.push(bytes[i].toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
