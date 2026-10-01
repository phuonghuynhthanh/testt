import React, { useState } from "react";
import { IMAGE_URL, API_SERVICES } from "../../config/config";

interface BlogThumbnailProps {
  bannerUrl?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Resolve full media source URL from storage key or direct link.
const resolveMediaUrl = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = IMAGE_URL || API_SERVICES || "";
  const cleanKey = url.replace(/^\/+/, "");
  return base ? `${base.replace(/\/+$/, "")}/${cleanKey}` : `/${cleanKey}`;
};

// Render article thumbnail with VietQuant teal gradient fallback.
export const BlogThumbnail: React.FC<BlogThumbnailProps> = ({
  bannerUrl,
  title = "VietQuant",
  size = "md",
  className = "",
}) => {
  const [loadError, setLoadError] = useState(false);
  const mediaUrl = resolveMediaUrl(bannerUrl);

  const sizeClasses = {
    sm: "size-8 rounded-lg text-xs",
    md: "size-10 rounded-xl text-sm",
    lg: "w-full aspect-video rounded-xl text-3xl",
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
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden shrink-0 flex items-center justify-center font-bold text-white shadow-inner bg-gradient-to-br from-[#00897b] via-[#00796b] to-[#004d40] border border-teal-500/20 select-none ${sizeClasses} ${className}`}
      title={title}
    >
      <span className="opacity-90 tracking-tighter drop-shadow-sm font-sans">V</span>
    </div>
  );
};

export default BlogThumbnail;
