import { Role } from "./authTypes";

export const SESSION_COOKIE_NAME = "admin_session";
const DEFAULT_SECRET = "volc-doc-center-admin-auth-secret-key-salt-2026";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKeyBytes(): Uint8Array {
  const secret = process.env.ADMIN_AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface SessionTokenPayload {
  uid: string;
  username: string;
  role: Role;
  exp: number; // unix timestamp in seconds
}

export async function signSessionToken(
  payload: Omit<SessionTokenPayload, "exp">,
  maxAgeSeconds = TOKEN_TTL_SECONDS
): Promise<string> {
  const fullPayload: SessionTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const payloadJson = JSON.stringify(fullPayload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const payloadB64 = base64UrlEncode(payloadBytes);

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    getSecretKeyBytes() as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigB64 = base64UrlEncode(new Uint8Array(sigBytes));

  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  try {
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      getSecretKeyBytes() as unknown as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlDecode(sigB64);
    const valid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      new TextEncoder().encode(payloadB64)
    );

    if (!valid) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload: SessionTokenPayload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
