export async function uploadMedia(
  file: File,
): Promise<{ url: string; type: "image" | "video"; name: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "上传失败");
  return result.data;
}
