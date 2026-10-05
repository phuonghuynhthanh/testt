import React, { useState } from "react";
import { IMAGE_URL, API_SERVICES } from "../../config/config";

interface BlogThumbnailProps {
  bannerUrl?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const resolveMediaUrl = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = IMAGE_URL || API_SERVICES || "";
  const cleanKey = url.replace(/^\/+/, "");
  return base ? `${base.replace(/\/+$/, "")}/${cleanKey}` : `/${cleanKey}`;
};

export const BlogThumbnail: React.FC<BlogThumbnailProps> = ({
  bannerUrl,
  title = "VietQuant",
  size = "md",
  className = "",
}) => {
  const [loadError, setLoadError] = useState(false);
  const mediaUrl = resolveMediaUrl(bannerUrl);

  const sizeClasses = {
    sm: "w-10 h-[26px] rounded-[4px] text-xs font-semibold",
    md: "w-12 h-8 rounded-lg text-[11px] font-bold",
    lg: "w-full aspect-video rounded-lg text-[11px] font-bold",
  }[size];

  if (mediaUrl && !loadError) {
    return (
      <div
        className={`relative overflow-hidden shrink-0 border border-surface-border bg-surface-elevated ${sizeClasses} ${className}`}
      >
        <img
          src={mediaUrl}
          alt={title}
          onError={() => setLoadError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden shrink-0 grid place-items-center text-content-muted bg-surface-elevated border border-surface-border select-none ${sizeClasses} ${className}`}
      title={title}
    >
      <span>{(title || "VQ").trim().slice(0, 2).toUpperCase()}</span>
    </div>
  );
};

export default BlogThumbnail;
