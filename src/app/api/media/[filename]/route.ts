import { readFile } from "fs/promises";
import path from "path";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: { filename: string } },
) {
  if (
    !/^[a-f0-9-]{36}\.(png|jpg|gif|webp|mp4|webm|pdf|txt|md|zip|docx|xlsx|pptx)$/.test(
      params.filename,
    )
  )
    return new Response(null, { status: 404 });
  try {
    const file = await readFile(
      path.join(process.cwd(), "data", "uploads", params.filename),
    );
    const ext = params.filename.split(".").pop()!;
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
    };
    const headers: Record<string, string> = {
      "Content-Type": types[ext],
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (!["png", "jpg", "gif", "webp", "mp4", "webm"].includes(ext)) {
      headers["Content-Type"] = "application/octet-stream";
      headers["Content-Disposition"] =
        `attachment; filename="${params.filename}"`;
    }
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = match?.[1]
        ? Number(match[1])
        : Math.max(0, file.length - Number(match?.[2]));
      let end =
        match?.[1] && match[2]
          ? Math.min(Number(match[2]), file.length - 1)
          : file.length - 1;
      if (
        !match ||
        (!match[1] && !match[2]) ||
        start > end ||
        start >= file.length
      )
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${file.length}` },
        });
      headers["Content-Range"] = `bytes ${start}-${end}/${file.length}`;
      headers["Content-Length"] = String(end - start + 1);
      return new Response(new Uint8Array(file.subarray(start, end + 1)), {
        status: 206,
        headers,
      });
    }
    headers["Content-Length"] = String(file.length);
    return new Response(new Uint8Array(file), { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
