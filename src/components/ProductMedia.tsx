"use client";
import { Image } from "@arco-design/web-react";
export default function ProductMedia({
  media,
  name,
}: {
  media: { url: string; type: "image" | "video" };
  name: string;
}) {
  return (
    <div className="product-uploaded-media">
      {media.type === "video" ? (
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          aria-label={`${name}产品视频`}
        />
      ) : (
        <Image src={media.url} alt={`${name}产品介绍`} preview />
      )}
    </div>
  );
}
