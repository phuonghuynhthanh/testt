import React, { useState } from "react";
import { PencilSimple, Code, Eye, Sparkle } from "@phosphor-icons/react";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";
import { PostLanguageSelect } from "../../../shared/ui/PostLanguageSelect";
import type { PostLanguage } from "../../../types/Language";

type EditorDisplayMode = "edit" | "markdown" | "preview";

const MODE_OPTIONS = [
  { value: "edit", label: "Soạn thảo", title: "Chế độ Soạn thảo trực quan", Icon: PencilSimple },
  { value: "markdown", label: "Markdown", title: "Chế độ xem và sửa mã Markdown", Icon: Code },
  { value: "preview", label: "Xem trước", title: "Chế độ Xem trước giao diện", Icon: Eye },
] as const;

interface BlogContentEditorCardProps {
  content: string;
  title: string;
  onChange: (value: string) => void;
  showAiButton?: boolean;
  isAiPending?: boolean;
  onAiGenerate?: () => void;
  canAiGenerate?: boolean;
  language: PostLanguage;
  onLanguageChange: (language: PostLanguage) => void;
}

export const BlogContentEditorCard: React.FC<BlogContentEditorCardProps> = ({
  content,
  title,
  onChange,
  showAiButton = false,
  isAiPending = false,
  onAiGenerate,
  canAiGenerate = false,
  language,
  onLanguageChange,
}) => {
  const [mode, setMode] = useState<EditorDisplayMode>("edit");

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h3 className="text-base font-semibold">Nội dung bài viết</h3>
          <p className="text-xs text-content-muted mt-0.5">
            Định dạng Markdown tiêu chuẩn hỗ trợ soạn thảo, mã nguồn và xem trước
          </p>
        </div>

        <div className="seg self-start" role="tablist">
          {MODE_OPTIONS.map(({ value, label, title: optionTitle, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              title={optionTitle}
              aria-label={optionTitle}
              aria-pressed={mode === value}
            >
              <Icon size={14} weight="light" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showAiButton && (
        <div className="flex flex-wrap items-end gap-3 pb-1">
          <PostLanguageSelect value={language} onChange={onLanguageChange} disabled={isAiPending} />
          <button
            type="button"
            title={isAiPending ? "Đang tạo bản nháp bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
            aria-label={isAiPending ? "Đang tạo bản nháp bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
            disabled={!canAiGenerate || isAiPending}
            onClick={onAiGenerate}
            className="btn btn-ai"
          >
            <Sparkle size={14} weight="light" className={isAiPending ? "animate-spin" : ""} />
            <span>{isAiPending ? "Đang tạo bản nháp..." : content ? "Tạo lại bằng AI" : "Tạo bản nháp bằng AI"}</span>
          </button>
        </div>
      )}

      {mode === "edit" && (
        <MarkdownEditor
          value={content}
          title={title}
          onChange={onChange}
          height="h-96"
          placeholder="Soạn thảo nội dung bài viết bằng Markdown..."
        />
      )}

      {mode === "markdown" && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập hoặc dán mã nguồn Markdown tại đây..."
            rows={16}
            className="inp !rounded-xl font-mono !text-xs leading-relaxed"
          />
        </div>
      )}

      {mode === "preview" && (
        <div className="min-h-[320px] overflow-y-auto rounded-xl border border-surface-border bg-surface-elevated/40 p-6">
          {content.trim() ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-center text-xs text-content-muted py-12">
              Chưa có nội dung để xem trước. Hãy nhập nội dung bài viết trước.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogContentEditorCard;
