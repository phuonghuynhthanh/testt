import { remarkListAnnotations, slugify } from "../../utils/courseMarkdownUtils";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Markdown renderer themed for the assignment parchment surface used in LMS.
 */
interface AssignmentMarkdownContentProps {
  content: string;
}

// Render assignment question and option markdown with the same visual rules as LMS.
const AssignmentMarkdownContent: React.FC<AssignmentMarkdownContentProps> = ({
  content,
}) => {
  return (
    <div className="font-normal assignment-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkListAnnotations]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { output: "mathml" }]]}
        components={{
          h1: ({ children }) => (
            <h1
              id={slugify(String(children))}
              className="mt-6 mb-3 text-xl font-bold text-stone-900 tracking-tight leading-tight"
            >
              <span className="block w-fit border-b-2 border-amber-600 pb-0.5">
                {children}
              </span>
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={slugify(String(children))}
              className="mt-5 mb-2 text-base font-semibold text-stone-800 flex items-center gap-2"
            >
              <span className="w-1 h-4 rounded-full bg-amber-600 shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugify(String(children))}
              className="mt-4 mb-1 text-sm font-semibold text-amber-800 uppercase tracking-wider"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              id={slugify(String(children))}
              className="mt-3 mb-1 text-sm font-medium text-stone-700"
            >
              {children}
            </h4>
          ),
          p: ({ node, children }) => {
            const paragraphChildren = node?.children ?? [];
            const isImageOnly =
              paragraphChildren.length > 0 &&
              paragraphChildren.every(
                (child) => child.type === "element" && child.tagName === "img",
              );

            if (isImageOnly) return <>{children}</>;

            return (
              <p className="my-2 text-sm sm:text-base leading-[1.8] text-stone-800">
                {children}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-0 ml-0 list-none">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-1.5 pl-2 ml-4 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm sm:text-base text-stone-800 leading-[1.7]">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <div className="my-3 flex gap-3 rounded-md border border-amber-400/60 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-amber-600 text-base leading-none">
                !
              </span>
              <div className="text-sm text-amber-900 leading-relaxed">
                {children}
              </div>
            </div>
          ),
          hr: () => (
            <div className="my-5 flex items-center gap-2">
              <div className="flex-1 h-px bg-stone-300" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
              <div className="flex-1 h-px bg-stone-300" />
            </div>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-md border border-stone-300">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-stone-200 border-b border-stone-300">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-stone-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-stone-100 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-amber-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-stone-800">{children}</td>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full rounded-md border border-stone-300 shadow-sm my-3"
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 underline underline-offset-2 hover:text-amber-700 transition-colors"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-stone-600">{children}</em>
          ),
          code({ className, children, ...rest }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children).trim();

            if (match) {
              return (
                <div className="my-3 rounded-md overflow-hidden border border-stone-400">
                  <div className="px-3 py-1.5 bg-stone-700 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
                      {match[1]}
                    </span>
                  </div>
                  <pre className="overflow-x-auto bg-stone-800 p-4">
                    <code className="text-xs sm:text-sm text-stone-100 font-mono leading-relaxed">
                      {codeText}
                    </code>
                  </pre>
                </div>
              );
            }

            return (
              <code
                className="mx-0.5 rounded bg-stone-300 border border-stone-400 text-amber-900 px-1 py-0.5 text-[12px] sm:text-[13px] font-mono select-all"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="relative [&>code]:block [&>code]:overflow-x-auto [&>code]:rounded-md [&>code]:border [&>code]:border-stone-400 [&>code]:bg-stone-800 [&>code]:p-4 [&>code]:text-xs [&>code]:text-stone-100 sm:[&>code]:text-sm">
                {children}
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AssignmentMarkdownContent;
