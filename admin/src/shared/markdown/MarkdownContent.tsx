/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { slugifyText } from "../../utils/markdownUtil";

interface MarkdownContentProps {
  content: string;
}

const getText = (child: React.ReactNode): string => {
  if (typeof child === "string" || typeof child === "number")
    return String(child);
  if (Array.isArray(child)) return child.map(getText).join("");
  return getText((child as any)?.props?.children);
};

const createHeadingComponent =
  (className: string) =>
  ({ node, children, ...props }: any) => {
    const nodeId = (node as any)?.properties?.id as string | undefined;
    const id = nodeId || slugifyText(getText(children));
    const Tag = `h${(node as any)?.tagName.slice(
      1,
    )}` as keyof JSX.IntrinsicElements;
    return (
      <Tag id={id} className={className} {...props}>
        {children}
      </Tag>
    );
  };

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  return (
    <div className="prose-vq">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
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
          h1: createHeadingComponent("hidden"),
          h2: createHeadingComponent(""),
          h3: createHeadingComponent(""),
          img: (props: any) => {
            const { title, alt, src } = props;
            return (
              <figure className="my-4">
                <img src={src} alt={alt} className="mx-auto" />
                {title && (
                  <figcaption className="mt-2 text-center text-xs italic text-content-muted">
                    {title}
                  </figcaption>
                )}
              </figure>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
            code({ className, children, ...rest }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                <SyntaxHighlighter
                  {...rest}
                  style={a11yDark}
                  language={match[1]}
                  PreTag="div"
                  showLineNumbers
                  wrapLongLines
                  lineNumberStyle={{ color: "#94A3B8" }}
                  customStyle={{
                    borderRadius: "8px",
                    padding: "0.85rem",
                    fontSize: "13px",
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    lineHeight: "1.6",
                    border: "1px solid #2A3347",
                  }}
                >
                  {String(children).trim()}
                </SyntaxHighlighter>
              ) : (
                <code {...rest}>
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return (
                <pre>{children}</pre>
              );
            },
          }}
        >
          {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
