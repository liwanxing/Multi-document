import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 51 * 1024 * 1024)
      return NextResponse.json(
        { message: "文件不能超过 50MB" },
        { status: 413 },
      );
    const file = (await request.formData()).get("file");
    if (!(file instanceof File))
      return NextResponse.json({ message: "请选择文件" }, { status: 400 });
    const types: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/webm": "webm",
    };
    const attachmentExt = file.name.toLowerCase().split(".").pop() || "";
    const attachment = [
      "pdf",
      "txt",
      "md",
      "zip",
      "docx",
      "xlsx",
      "pptx",
    ].includes(attachmentExt);
    const ext = attachment ? attachmentExt : types[file.type],
      video = file.type.startsWith("video/");
    if (
      !ext ||
      file.size > (video || attachment ? 50 : 10) * 1024 * 1024 ||
      !file.size
    )
      return NextResponse.json(
        {
          message: "支持 10MB 内图片、50MB 内视频及 PDF/TXT/MD/ZIP/Office 文件",
        },
        { status: 400 },
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid = attachment
      ? ["txt", "md"].includes(ext) ||
        (ext === "pdf"
          ? bytes.toString("ascii", 0, 5) === "%PDF-"
          : bytes[0] === 80 && bytes[1] === 75)
      : ext === "png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : ext === "jpg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : ext === "gif"
            ? /^GIF8[79]a/.test(bytes.toString("ascii", 0, 6))
            : ext === "webp"
              ? bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP"
              : ext === "mp4"
                ? bytes.toString("ascii", 4, 8) === "ftyp"
                : bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    if (!valid)
      return NextResponse.json(
        { message: "文件内容与格式不匹配" },
        { status: 400 },
      );
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "data", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes, { flag: "wx" });
    return NextResponse.json({
      code: 0,
      data: {
        url: `/api/media/${filename}`,
        type: attachment ? "file" : video ? "video" : "image",
        name: file.name,
      },
    });
  } catch {
    return NextResponse.json({ message: "上传失败，请重试" }, { status: 500 });
  }
}
