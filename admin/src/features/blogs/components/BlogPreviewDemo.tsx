import React, { useMemo, useState } from "react";
import "../../../styles/blog.css";
import { Clock } from "@phosphor-icons/react";
import TableOfContent, { type Heading } from "./TableOfContent";
import { slugifyText } from "../../../utils/markdownUtil";
import HeaderActionButton, { type BlogPreviewMode } from "./HeaderActionButton";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";
import TextareaField from "../../../shared/input/TextareaField";

interface BlogPreviewProps {
  tag: string;
  title: string;
  banner: string;
  content: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onSave?: () => void;
  isLoading?: boolean;
}

// Render the blog content modal with edit, markdown, and preview modes.
const BlogPreviewDemo: React.FC<BlogPreviewProps> = ({
  tag,
  title,
  banner,
  content,
  onClose,
  onChange,
  onSave,
  isLoading = false,
}) => {
  // Extract markdown headings to build the table of contents.
  const headings: Heading[] = useMemo(() => {
    const regex = /^(#{1,6})\s+(.*)$/gm;
    const matches: Heading[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugifyText(text);
      matches.push({ id, text, level });
    }
    return matches;
  }, [content]);

  const [mode, setMode] = useState<BlogPreviewMode>("edit");
  const isPreviewMode = mode === "preview";

  return (
    <div className="fixed inset-0 z-50 flex h-screen max-w-none flex-col overflow-hidden bg-surface-base p-3 sm:p-5">
      <div className="mb-4 shrink-0 border-b border-surface-border pb-4">
        <HeaderActionButton
          onClose={onClose}
          onModeChange={setMode}
          mode={mode}
          onSave={onSave ?? (() => {})}
          isLoading={isLoading}
        />
      </div>

      <div className="w-full flex-1 min-h-0 overflow-y-auto">
        <div className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-10">
          <div className="mx-auto mb-6 max-w-6xl xl:hidden">
            <TableOfContent
              headings={headings}
              isVietnamese={true}
              editMode={!isPreviewMode}
            />
          </div>

          <div className="mx-auto flex max-w-6xl">
            <div className="min-w-0 flex-1 xl:pr-8">
              {isPreviewMode && (
                <div>
                  <h1 className="mb-3 text-2xl font-bold leading-tight text-content-primary sm:text-3xl md:text-4xl">
                    {title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono text-content-muted sm:text-sm">
                    <Clock weight="light" className="size-4 shrink-0" />
                    <span>9/3/2025</span>
                    <span className="h-3 w-[1px] bg-surface-border"></span>
                    <p>{tag}</p>
                  </div>
                  <div className="my-4 h-[1px] w-full bg-surface-border"></div>
                  {banner && (
                    <div className="w-full rounded-lg overflow-hidden px-2 sm:px-4">
                      <img
                        src={banner}
                        alt={title}
                        className="h-auto w-full rounded-lg object-contain border border-surface-border"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              )}
              {mode === "preview" ? (
                <MarkdownContent content={content} />
              ) : mode === "markdown" ? (
                <TextareaField
                  label="Nội dung Markdown"
                  id="blog-markdown-content"
                  name="blog-markdown-content"
                  value={content}
                  handleChange={(e) => onChange(e.target.value)}
                  placeholder="Nhập nội dung markdown tại đây..."
                  rows={24}
                />
              ) : (
                <MarkdownEditor
                  value={content}
                  title={title}
                  onChange={onChange}
                />
              )}
            </div>
            <aside className="hidden w-80 xl:block">
              <div className="sticky top-0">
                <TableOfContent
                  headings={headings}
                  isVietnamese={true}
                  editMode={!isPreviewMode}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPreviewDemo;
