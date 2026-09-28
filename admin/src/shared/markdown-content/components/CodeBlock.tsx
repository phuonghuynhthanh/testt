import React, { Suspense, useEffect, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { FiCheck, FiCopy } from "react-icons/fi";

const oneDarkPromise =
  import("react-syntax-highlighter/dist/esm/styles/prism").then(
    (module) => module.oneDark,
  );

import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import ts from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import py from "react-syntax-highlighter/dist/esm/languages/prism/python";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("python", py);

interface CodeBlockProps {
  language?: string;
  code: string;
  enableCopy: boolean;
  colabLink?: string;
}

// Render syntax-highlight code blocks with optional copy and Colab actions.
const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  enableCopy = false,
  colabLink,
}) => {
  const [copied, setCopied] = useState(false);
  const [oneDark, setOneDark] = useState<Record<string, unknown> | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  // Lazy-load syntax theme on first render.
  useEffect(() => {
    let mounted = true;
    oneDarkPromise.then((theme) => {
      if (mounted) setOneDark(theme as Record<string, unknown>);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Track viewport changes to disable line numbers on small screens.
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Copy code content into clipboard with short feedback state.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy code block", error);
    }
  };

  return (
    <div className="group relative my-6 overflow-hidden rounded-xl border border-white/10 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0d0d] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56] opacity-80" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e] opacity-80" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f] opacity-80" />
          {language && (
            <span className="ml-3 text-xs uppercase tracking-widest text-[#00be73] opacity-80">
              {language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {colabLink && (
            <button
              type="button"
              onClick={() =>
                window.open(colabLink, "_blank", "noopener,noreferrer")
              }
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-all duration-200 hover:border-[#00be73]/40 hover:bg-[#00be73]/20 hover:text-[#00be73]"
            >
              Open Colab
            </button>
          )}
          {enableCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-all duration-200 hover:border-[#00be73]/40 hover:bg-[#00be73]/20 hover:text-[#00be73]"
            >
              {copied ? (
                <>
                  <FiCheck className="text-[#00be73]" />
                  <span className="text-[#00be73]">Copied</span>
                </>
              ) : (
                <>
                  <FiCopy />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <Suspense
        fallback={
          <div className="animate-pulse bg-[#121212] p-6 text-sm text-white/30">
            Loading code...
          </div>
        }
      >
        {oneDark ? (
          <SyntaxHighlighter
            language={language}
            style={oneDark as any}
            PreTag="div"
            wrapLongLines
            showLineNumbers={!isMobile}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              padding: isMobile ? "1rem 0.75rem" : "1.25rem 1rem",
              fontSize: "14px",
              lineHeight: "1.75",
              backgroundColor: "#121212",
            }}
            lineNumberStyle={{
              color: "rgba(255,255,255,0.15)",
              minWidth: "2.5em",
              paddingRight: "1em",
              userSelect: "none",
            }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <div className="animate-pulse bg-[#121212] p-6 text-sm text-white/30">
            Loading theme...
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default CodeBlock;
