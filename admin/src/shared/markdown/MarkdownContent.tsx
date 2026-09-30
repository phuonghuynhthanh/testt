/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { slugifyText } from "../../utils/markdownUtil";
import { BiSolidQuoteLeft } from "react-icons/bi";

interface MarkdownContentProps {
  content: string;
}

const getText = (child: React.ReactNode): string => {
  if (typeof child === "string" || typeof child === "number")
    return String(child);
  if (Array.isArray(child)) return child.map(getText).join("");
  return getText((child as any)?.props?.children);
};

// Create semantic heading renderers with stable anchor IDs.
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
    <div className="font-markdown flex justify-center text-base markdown-container">
      <div className="max-w-4xl w-full text-lg leading-7 prose prose-a:no-underline px-4 text-justify">
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
            // Hidden h1 replace with header in blog article
            h1: createHeadingComponent(
              "hidden text-4xl font-semibold mt-8 mb-4 text-primary-white my-4 sm:my-5 pb-2 sm:pb-3 border-b border-[#F1F1F1] text-left ",
            ),
            h2: createHeadingComponent(
              "text-2xl md:text-3xl font-semibold mt-8 mb-4 text-primary-white my-4 sm:my-5 pb-2 sm:pb-3 border-b border-[#F1F1F1] text-left text-primary-white",
            ),
            h3: createHeadingComponent(
              "mt-4 mb-4 text-left text-primary-white text-xl flex items-center gap-2",
            ),
            img: (props: any) => {
              const { title, alt, src } = props;
              return (
                <figure className="my-4">
                  <img src={src} alt={alt} className="mx-auto rounded-lg" />
                  {title && (
                    <figcaption className="text-center italic mt-2 text-sm text-gray-500">
                      {title}
                    </figcaption>
                  )}
                </figure>
              );
            },
            table: ({ children }) => (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-600">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-800 text-primary-white border border-primary-neutral-500">
                {children}
              </thead>
            ),
            tr: ({ children }) => (
              <tr className="border border-primary-neutral-500 text-primary-white text-sm ">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className=" border border-primary-neutral-500 px-2 sm:px-4 py-2 bg-primary-black-medium text-primary-white font-bold text-sm sm:text-base ">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-500 px-4 py-2 text-base">
                {children}
              </td>
            ),
            ul: ({ children }) => (
              <div className="leading-6">
                <ul className="list-disc list-inside text-primary-white ml-4 mb-4">
                  {children}
                </ul>
              </div>
            ),
            ol: ({ children }) => (
              <div className="leading-6 text-sm">
                <ol className="list-decimal list-inside  text-primary-white ml-6 mb-4">
                  {children}
                </ol>
              </div>
            ),
            li: ({ children }) => (
              <li className="mb-2 line-height-1.75 text-primary-white">
                {children}
              </li>
            ),
            a: ({ children, href }) => (
              <a href={href} className="text-blue-500 hover:underline">
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <div className="bg-primary-black-light rounded-md pl-4 py-3 border-l-4 border-primary-green italic text-primary-white relative">
                <BiSolidQuoteLeft className="absolute top-1 left-1 text-primary-green h-6 w-6 sm:h-8 sm:w-8 fill-current" />
                <div className="px-6 break-words ">{children}</div>
              </div>
            ),
            code({ className, children, ...rest }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                <SyntaxHighlighter
                  language={match[1]}
                  PreTag="div"
                  showLineNumbers
                  wrapLongLines
                  customStyle={{
                    borderRadius: "8px",
                    padding: "1rem",
                    fontSize: "17px",
                    backgroundColor: "#222222",
                    color: "#F9FAFB",
                    lineHeight: "1.5",
                  }}
                  {...rest}
                >
                  {String(children).trim()}
                </SyntaxHighlighter>
              ) : (
                <code
                  className="bg-surface-elevated text-base text-content-primary px-1 py-0.5 rounded"
                  {...rest}
                >
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return (
                <pre className="bg-surface-elevated text-content-primary p-3 rounded-md border border-surface-border overflow-auto">
                  {children}
                </pre>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownContent;
