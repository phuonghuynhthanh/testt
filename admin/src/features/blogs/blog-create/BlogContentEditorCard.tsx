import React, { useState } from "react";
import { MdEdit, MdCode, MdPreview } from "react-icons/md";
import { BsStars } from "react-icons/bs";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";

type EditorDisplayMode = "edit" | "markdown" | "preview";

const MODE_OPTIONS = [
  { value: "edit", label: "Soạn thảo", title: "Chế độ Soạn thảo trực quan", Icon: MdEdit },
  { value: "markdown", label: "Markdown", title: "Chế độ xem và sửa mã Markdown", Icon: MdCode },
  { value: "preview", label: "Xem trước", title: "Chế độ Xem trước giao diện", Icon: MdPreview },
] as const;

interface BlogContentEditorCardProps {
  content: string;
  title: string;
  onChange: (value: string) => void;
  showAiButton?: boolean;
  isAiPending?: boolean;
  onAiGenerate?: () => void;
  canAiGenerate?: boolean;
}

// Render multi-mode blog content editor supporting rich editor, raw markdown, and live preview.
export const BlogContentEditorCard: React.FC<BlogContentEditorCardProps> = ({
  content,
  title,
  onChange,
  showAiButton = false,
  isAiPending = false,
  onAiGenerate,
  canAiGenerate = false,
}) => {
  const [mode, setMode] = useState<EditorDisplayMode>("edit");

  return (
    <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h3 className="font-semibold text-content-primary text-base">Nội dung bài viết</h3>
          <p className="text-xs text-content-muted mt-0.5">
            Định dạng Markdown tiêu chuẩn hỗ trợ soạn thảo, mã nguồn và xem trước
          </p>
        </div>

        {/* Render the three editor modes from one shared button definition. */}
        <div className="flex items-center self-start sm:self-auto bg-surface-elevated rounded-xl p-1 border border-surface-border gap-1">
          {MODE_OPTIONS.map(({ value, label, title: optionTitle, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              title={optionTitle}
              aria-label={optionTitle}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                mode === value
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showAiButton && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            title={isAiPending ? "Đang tạo bản nháp bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
            aria-label={isAiPending ? "Đang tạo bản nháp bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
            disabled={!canAiGenerate || isAiPending}
            onClick={onAiGenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3.5 py-2 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-900/50 disabled:opacity-50"
          >
            <BsStars className={`text-sm text-purple-400 ${isAiPending ? "animate-pulse" : ""}`} />
            <span>{isAiPending ? "Đang tạo bản nháp..." : content ? "Tạo lại bằng AI" : "Tạo bản nháp bằng AI"}</span>
          </button>
        </div>
      )}

      {/* Mode 1: Visual Editor */}
      {mode === "edit" && (
        <MarkdownEditor
          value={content}
          title={title}
          onChange={onChange}
          height="h-96"
          placeholder="Soạn thảo nội dung bài viết bằng Markdown..."
        />
      )}

      {/* Mode 2: Raw Markdown Textarea */}
      {mode === "markdown" && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập hoặc dán mã nguồn Markdown tại đây..."
            rows={16}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated p-4 font-mono text-xs leading-relaxed text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition resize-y"
          />
        </div>
      )}

      {/* Mode 3: Live Preview */}
      {mode === "preview" && (
        <div className="rounded-xl border border-surface-border bg-surface-elevated/40 p-6 min-h-[320px] max-h-[600px] overflow-y-auto">
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
