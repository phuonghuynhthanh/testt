import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import {
  normalizeCourseMarkdownForPreview,
  remarkListAnnotations,
  slugify,
} from "../../utils/courseMarkdownUtils";
import ButtonMarkdownCustom from "./components/ButtonMarkdownCustom";
import Callout from "./components/Callout";
import CardList from "./components/CardList";
import CodeBlock from "./components/CodeBlock";
import DropdownList from "./components/DropdownList";
import PreviewImage from "./components/PreviewImage";
import SquareFlipCard from "./components/SquareFlipCard";
import StepList from "./components/StepList";

interface CourseMarkdownContentProps {
  content: string;
  enableMarkdownStyles?: boolean;
  enableCopyCode?: boolean;
  colabLink?: string;
}

// Check nested React nodes for KaTeX display output before choosing block wrappers.
function containsClassName(node: React.ReactNode, targetClassName: string): boolean {
  if (!React.isValidElement(node)) {
    if (Array.isArray(node)) {
      return node.some((child) => containsClassName(child, targetClassName));
    }
    return false;
  }

  const element = node as React.ReactElement<{
    className?: string;
    children?: React.ReactNode;
  }>;
  const className = element.props.className ?? "";

  return (
    className.split(/\s+/).includes(targetClassName) ||
    containsClassName(element.props.children, targetClassName)
  );
}

// Render course lesson markdown with custom list marker components.
const CourseMarkdownContent: React.FC<CourseMarkdownContentProps> = ({
  content,
  enableMarkdownStyles = true,
  enableCopyCode = false,
  colabLink,
}) => {
  const normalizedContent = normalizeCourseMarkdownForPreview(content);

  return (
    <div
      className={`text-white font-normal ${enableMarkdownStyles ? "markdown-content" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkListAnnotations]}
        rehypePlugins={[
          rehypeRaw,
          [
            rehypeKatex,
            {
              output: "htmlAndMathml",
              strict: "ignore",
              trust: false,
            },
          ],
        ]}
        components={{
          // Route special list marker classes to custom components.
          ul({ className, children, ...rest }) {
            const listClassName = className ?? "";

            // Extract plain list item nodes from react-markdown wrapper elements.
            const getItems = () => {
              const items: React.ReactNode[] = [];
              React.Children.forEach(children, (child) => {
                if (!React.isValidElement(child)) return;
                const element = child as React.ReactElement<{
                  children?: React.ReactNode;
                }>;
                items.push(element.props.children);
              });
              return items;
            };

            const items = getItems();

            if (listClassName.includes("component-list-dropdown"))
              return <DropdownList items={items} />;
            if (listClassName.includes("component-list-card"))
              return <CardList items={items} />;
            if (listClassName.includes("component-list-flip"))
              return <SquareFlipCard items={items} />;
            if (listClassName.includes("component-step-list"))
              return <StepList items={items} />;

            return (
              <ul className="my-4 ml-6 space-y-2 pl-2" {...rest}>
                {children}
              </ul>
            );
          },
          h1: ({ children }) => (
            <h1
              id={slugify(children as string)}
              className="mt-10 mb-4 text-2xl font-bold uppercase tracking-tight leading-tight text-white sm:text-3xl"
            >
              <span className="block w-fit border-b-2 border-[#00be73] pb-1">
                {children}
              </span>
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={slugify(children as string)}
              className="mt-8 mb-3 flex items-center gap-2 text-lg font-semibold uppercase text-white/95 sm:text-xl"
            >
              <span className="h-5 w-1 shrink-0 rounded-full bg-[#00be73]" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugify(children as string)}
              className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wider text-[#00be73] sm:text-base sm:tracking-widest"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              id={slugify(children as string)}
              className="mt-5 mb-2 text-base font-medium text-white/80"
            >
              {children}
            </h4>
          ),
          p: ({ node, children, className }) => {
            const paragraphChildren = node?.children ?? [];
            const isImageOnlyParagraph =
              paragraphChildren.length > 0 &&
              paragraphChildren.every(
                (child) => child.type === "element" && child.tagName === "img",
              );

            if (isImageOnlyParagraph) return <>{children}</>;

            const paragraphClassName = className ?? "";
            if (paragraphClassName.includes("component-callout-paragraph")) {
              return <Callout>{children}</Callout>;
            }

            if (containsClassName(children, "katex-display")) {
              return <div className="my-4 overflow-x-auto">{children}</div>;
            }

            return (
              <p className="my-3 text-base leading-[1.9] text-white/75 sm:text-[17px]">
                {children}
              </p>
            );
          },
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 pl-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 text-base leading-[1.8] text-white/75 sm:text-[17px]">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00be73]" />
              <div className="min-w-0 flex-1">{children}</div>
            </li>
          ),
          blockquote: ({ children }) => <Callout>{children}</Callout>,
          hr: () => (
            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#00be73]/50" />
              <div className="h-px flex-1 bg-white/10" />
            </div>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-[15px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-white/10 bg-[#1A1A1A]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-white/[0.03]">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#00be73] sm:px-4">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-3 text-white/70 sm:px-4">{children}</td>
          ),
          img: ({ src, alt }) => (
            <PreviewImage
              src={src}
              alt={alt}
              className="max-w-full rounded-xl border border-white/10 shadow-xl"
            />
          ),
          a: ({ href, children }) => (
            <ButtonMarkdownCustom href={href} colabLink={colabLink}>
              {children}
            </ButtonMarkdownCustom>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/60">{children}</em>
          ),
          code({ className, children, ...rest }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children).trim();
            if (match) {
              return (
                <CodeBlock
                  language={match[1]}
                  code={codeText}
                  enableCopy={enableCopyCode}
                  colabLink={colabLink}
                />
              );
            }
            return (
              <code
                className="mx-0.5 rounded-md border border-white/10 bg-[#1A1A1A] px-1 py-0.5 text-[13px] text-[#00be73] select-all sm:px-1.5 sm:text-[15px]"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <pre className="relative">{children}</pre>;
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default CourseMarkdownContent;
