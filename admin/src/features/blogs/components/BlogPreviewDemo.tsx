import React, { useMemo, useState } from "react";
import "../../../styles/blog.css";

import { LuClock8 } from "react-icons/lu";
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
  content: string; // Updated prop type to accept content object
  onClose: () => void; // Function prop for closing the preview
  onChange: (value: string) => void; // Function to handle content changes
  onSave?: () => void; // Function to handle save changes
  isLoading?: boolean; // Loading state for save button
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
      const id = slugifyText(text); // dùng chung slugify
      matches.push({ id, text, level });
    }
    return matches;
  }, [content]);

  const [mode, setMode] = useState<BlogPreviewMode>("edit");
  const isPreviewMode = mode === "preview";

  return (
    <div
      className="fixed inset-0 z-50 flex h-screen max-w-none flex-col overflow-hidden bg-primary-black p-5 font-markdown prose prose-a:no-underline"
      style={{ fontFamily: '"lexend", sans-serif' }}
    >
      <div className="mb-4 shrink-0 border-b border-gray-200 pb-4">
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
          {/* Mobile TOC */}
          <div className="mx-auto mb-6 max-w-6xl xl:hidden">
            <TableOfContent
              headings={headings}
              isVietnamese={false}
              editMode={!isPreviewMode}
            />
          </div>

          {/* Main layout */}
          <div className="mx-auto flex max-w-6xl">
            {/* Left content */}
            <div className="flex-1 pr-8">
              {isPreviewMode && (
                <div>
                  <h1 className="mb-3 font-markdown text-2xl font-semibold leading-tight text-primary-white sm:text-3xl md:text-4xl">
                    {title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-primary-white/80 sm:text-base">
                    <LuClock8 className="size-4 shrink-0" />
                    <span>9/3/2025</span>
                    <span className="h-4 w-[2px] bg-gray-300"></span>
                    <p>{tag}</p>
                  </div>
                  <div className="my-4 h-[1px] w-full bg-gray-300"></div>
                  {banner && (
                    <div className="w-full rounded-md px-2 sm:px-4">
                      <img
                        src={banner}
                        alt={title}
                        className="h-auto w-full rounded-md object-contain"
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
                  label="Markdown Content"
                  id="blog-markdown-content"
                  name="blog-markdown-content"
                  value={content}
                  handleChange={(e) => onChange(e.target.value)}
                  placeholder="Write your markdown content here..."
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
            {/* Desktop TOC */}
            <aside className="hidden w-80 xl:block">
              <div className="sticky top-0">
                <TableOfContent
                  headings={headings}
                  isVietnamese={false}
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
