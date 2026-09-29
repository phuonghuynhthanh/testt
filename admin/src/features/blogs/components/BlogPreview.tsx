import React, { useMemo } from "react";
import "../../../styles/blog.css";

import { LuClock8 } from "react-icons/lu";

import MarkdownContent from "../../../shared/markdown/MarkdownContent";
import { slugifyText } from "../../../utils/markdownUtil";
import type { Heading } from "./TableOfContent";
import TableOfContent from "./TableOfContent";
interface BlogPreviewProps {
  tag: string;
  title: string;
  banner: string;
  content: string; // Updated prop type to accept content object
  onClose: () => void; // Function prop for closing the preview
  hideCloseButton?: boolean; // Optional prop to hide the close button
}

const BlogPreview: React.FC<BlogPreviewProps> = ({
  tag,
  title,
  banner,
  content,
  onClose,
  hideCloseButton = false,
}) => {
  const headings: Heading[] = useMemo(() => {
    const regex = /^(#{2,3})\s+(.*)$/gm;
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
  return (
    <div
      className="font-markdown prose prose-a:no-underline max-w-none fixed inset-0 bg-primary-black z-50 p-5"
      style={{ fontFamily: '"lexend", sans-serif' }}
    >
      {!hideCloseButton && (
        <button
          onClick={onClose}
          className="mb-2 p-2 bg-red-500 text-white border-none cursor-pointer"
        >
          Đóng xem trước
        </button>
      )}
      <div className="h-full w-full overflow-hidden flex flex-col overflow-y-scroll">
        {/* Scrollable content area */}
        <div className="flex-1 ">
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-10">
            {/* Mobile TOC */}
            <div className="xl:hidden mb-6 max-w-6xl mx-auto">
              <TableOfContent headings={headings} isVietnamese={true} />
            </div>

            {/* Main layout */}
            <div className="flex max-w-6xl mx-auto gap-8">
              {/* Left content */}
              <div className="flex-1 pr-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-primary-white font-semibold mb-3 font-markdown leading-tight">
                  {title}
                </h1>

                <div className="flex flex-wrap text-primary-white mt-4 gap-2 items-center text-sm sm:text-base">
                  <LuClock8 className="size-4 shrink-0" />
                  <span>9/3/2025</span>
                  <span className="h-4 w-[2px] bg-gray-300"></span>
                  <p>{tag}</p>
                </div>

                <div className="h-[1px] w-full bg-gray-300 my-4"></div>
                {banner && (
                  <img
                    src={banner}
                    alt={title}
                    className="w-full h-auto object-contain rounded-md px-2 sm:px-4 mb-4"
                  />
                )}
                <MarkdownContent content={content} />
              </div>

              {/* Desktop TOC */}
              <aside className="hidden xl:block w-80 flex-shrink-0">
                <div className="sticky top-10">
                  <TableOfContent headings={headings} isVietnamese={true} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPreview;
