import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PencilSimple, Eye } from "@phosphor-icons/react";
import { previewLinkedInContent } from "../../../services/linkedin/handleLinkedIn";
import { apiErrorMessage } from "../../../types/Api";
import type { LinkedInLinkPlacement, LinkedInMediaAsset } from "../../../types/Publication";
import type { PostLanguage } from "../../../types/Language";
import { linkedinMediaKey, linkedinMediaUrl } from "../../../utils/linkedinMedia";
import { trimLinkedInPreviewUrl } from "../../../utils/linkedinPreviewUrl";

// Keep LinkedIn text literal while making safe HTTP links clickable in the preview.
const PreviewText = ({ content }: { content: string }) => (
  <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-content-secondary">
    {content.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => {
      if (!/^https?:\/\//.test(part)) return part;
      const url = trimLinkedInPreviewUrl(part);
      return (
        <span key={index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[#70b5f9] underline"
          >
            {url}
          </a>
          {part.slice(url.length)}
        </span>
      );
    })}
  </div>
);

// Share edit and server-composed preview modes across both LinkedIn authoring flows.
export const LinkedInContentEditor = ({
  content,
  onChange,
  media,
  linkPlacement,
  language,
  blogId,
  disabled = false,
}: {
  content: string;
  onChange: (content: string) => void;
  media: LinkedInMediaAsset[];
  linkPlacement: LinkedInLinkPlacement;
  language: PostLanguage;
  blogId?: string;
  disabled?: boolean;
}) => {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const preview = useQuery({
    queryKey: ["linkedin-preview", blogId ?? "standalone", content, linkPlacement, language],
    queryFn: ({ signal }) => previewLinkedInContent({ content, linkPlacement, language }, blogId, signal),
    enabled: mode === "preview" && Boolean(content.trim()),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <label className="label !mb-0">
          Nội dung bài đăng <span className="text-rose-400">*</span>
          <span className={`hint tabular-nums ml-2 font-normal ${content.length > 3000 ? "!text-rose-400" : ""}`}>{content.length}/3000</span>
        </label>
        <div className="seg">
          {([
            { value: "edit", label: "Soạn thảo", Icon: PencilSimple },
            { value: "preview", label: "Xem trước", Icon: Eye },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={mode === value ? "active" : ""}
            >
              <Icon size={14} weight="light" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "edit" ? (
        <textarea
          aria-label="Nội dung bài đăng LinkedIn"
          value={content}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={11}
          placeholder="Nhập nội dung bài LinkedIn..."
          className="inp"
        />
      ) : (
        <div className="min-h-[280px] max-h-[500px] overflow-y-auto rounded-xl border border-surface-border bg-surface-elevated/40 p-4" aria-live="polite">
          {!content.trim() ? (
            <p className="py-12 text-center text-xs text-content-muted">Chưa có nội dung để xem trước.</p>
          ) : preview.isFetching || preview.isPending ? (
            <p role="status" className="text-xs text-content-muted">Đang tải bản xem trước…</p>
          ) : preview.isError ? (
            <div role="alert" className="space-y-2 text-xs text-rose-400">
              <p>Không thể tải bản xem trước: {apiErrorMessage(preview.error)}</p>
              <button type="button" onClick={() => { void preview.refetch(); }} className="underline">Thử lại</button>
            </div>
          ) : preview.data && (
            <div className="space-y-4">
              <PreviewText content={preview.data.content} />
              {media.length > 0 && (
                <div className={`grid gap-2.5 ${media.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                  {[...media].sort((a, b) => a.order - b.order).map((image) => (
                    <img
                      key={linkedinMediaKey(image)}
                      src={linkedinMediaUrl(image)}
                      alt={image.altText}
                      className="max-h-80 w-full rounded border border-surface-border object-contain"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
