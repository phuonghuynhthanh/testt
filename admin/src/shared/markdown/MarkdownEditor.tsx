import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  MDXEditor,
  type MDXEditorMethods,
  ChangeCodeMirrorLanguage,
  ConditionalContents,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  toolbarPlugin,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertImage,
  InsertCodeBlock,
  InsertTable,
  UndoRedo,
  Separator,
  ListsToggle,
  useCodeBlockEditorContext,
  type CodeBlockEditorDescriptor,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { UploadSimple } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { uploadFileImage } from "../../services/file/handleFile";
import "../../styles/MarkdownEditor.css";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Prec } from "@codemirror/state";

// Override the editor's built-in light syntax colors with readable dark-surface highlights.
const CODE_HIGHLIGHT = Prec.highest(syntaxHighlighting(HighlightStyle.define([
  { tag: tags.comment, color: "#94A3B8" },
  { tag: [tags.keyword, tags.operator, tags.bool, tags.number], color: "#67E8F9" },
  { tag: [tags.string, tags.character, tags.regexp], color: "#BEF264" },
  { tag: [tags.name, tags.propertyName], color: "#FDBA74" },
  { tag: tags.punctuation, color: "#CBD5E1" },
  { tag: tags.invalid, color: "#FDA4AF" },
])));

const MAX_SIZE = 2 * 1024 * 1024;
const MATH_BLOCK_LANGUAGE = "latex-math";
// Multi-line display math: $$\n ... \n$$
const MARKDOWN_MATH_BLOCK_REGEX =
  /(^|\n)[ \t]*\$\$[ \t]*\n([\s\S]*?)\n[ \t]*\$\$[ \t]*(?=\n|$)/g;
// Single-line display math on its own line: $$ ... $$
const MARKDOWN_MATH_INLINE_BLOCK_REGEX =
  /(^|\n)[ \t]*\$\$[ \t]*([^\n]+?)[ \t]*\$\$[ \t]*(?=\n|$)/g;
const EDITOR_MATH_BLOCK_REGEX =
  /(^|\n)```latex-math[ \t]*\n([\s\S]*?)\n```[ \t]*(?=\n|$)/g;
// A "<" not starting a real HTML construct (tag/closing tag/comment) makes the
// MDXEditor markdown import treat it as an opening tag/autolink and abort the
// whole import — e.g. "(<30)". Escape those so they survive as literal text.
const EDITOR_UNSAFE_LT_REGEX = /<(?![a-zA-Z/!])/g;
// QuantVN component markers are authored as HTML comments. MDXEditor
// silently DROPS HTML comments on export, which would strip the markers on save.
// Round-trip them through a fenced code block instead so they survive editing.
const MARKER_LANGUAGE = "qvn-marker";
const COMPONENT_COMMENT_REGEX =
  /<!--[ \t]*(component:[\w-]+|list:\w+)[ \t]*-->/g;
const EDITOR_MARKER_BLOCK_REGEX =
  /(^|\n)```qvn-marker[ \t]*\n([\s\S]*?)\n```[ \t]*(?=\n|$)/g;

interface MarkdownEditorProps {
  value: string;
  title: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
  className?: string;
}

interface MarkdownToolbarProps {
  onUploadFiles: (files: File[]) => Promise<void>;
}

// Present display LaTeX blocks as fenced math code so MDXEditor does not upscale
// them as rich text. Handles both the multi-line ($$\n...\n$$) and the single-line
// ($$ ... $$) display forms; single-line math left raw would otherwise survive as
// literal "$$" text in the editor.
const encodeForEditor = (markdown: string): string => {
  const withMultiLine = markdown.replace(
    MARKDOWN_MATH_BLOCK_REGEX,
    (_, prefix, mathBody) =>
      `${prefix}\`\`\`${MATH_BLOCK_LANGUAGE}\n${mathBody.trimEnd()}\n\`\`\``,
  );

  const withSingleLine = withMultiLine.replace(
    MARKDOWN_MATH_INLINE_BLOCK_REGEX,
    (_, prefix, mathBody) =>
      `${prefix}\`\`\`${MATH_BLOCK_LANGUAGE}\n${mathBody.trim()}\n\`\`\``,
  );

  const withMarkers = withSingleLine.replace(
    COMPONENT_COMMENT_REGEX,
    (_, marker) => `\`\`\`${MARKER_LANGUAGE}\n${marker}\n\`\`\``,
  );

  return withMarkers.replace(EDITOR_UNSAFE_LT_REGEX, "&lt;");
};

// Restore fenced editor blocks back to their source forms (math + component
// markers) and undo the literal-"<" escaping applied for the editor.
const decodeForEditor = (markdown: string): string =>
  markdown
    .replace(EDITOR_MATH_BLOCK_REGEX, (_, prefix, mathBody) => {
      return `${prefix}$$\n${mathBody.trimEnd()}\n$$`;
    })
    .replace(
      EDITOR_MARKER_BLOCK_REGEX,
      (_, prefix, marker) => `${prefix}<!-- ${marker.trim()} -->`,
    )
    .replace(/\\</g, "<")
    .replace(/&lt;/g, "<");

// Plain editor for code blocks whose language is not registered in
// codeBlockLanguages. The CodeMirror import visitor only matches registered
// languages, so without this an unknown language (e.g. ```bash) has no visitor
// and aborts the whole markdown import — leaving the editor truncated or blank.
// This keeps the original language label intact on export.
const PlainCodeEditor: CodeBlockEditorDescriptor["Editor"] = ({
  code,
  language,
}) => {
  const { setCode } = useCodeBlockEditorContext();

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="border-b border-surface-border px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-content-muted">
        {language || "text"}
      </div>
      <textarea
        defaultValue={code}
        spellCheck={false}
        onChange={(event) => setCode(event.target.value)}
        className="block w-full resize-y bg-transparent p-3 font-mono text-sm leading-relaxed text-content-primary outline-none"
        rows={Math.min(24, Math.max(3, code.split("\n").length + 1))}
      />
    </div>
  );
};

// Lowest priority so the CodeMirror descriptor (registered languages) wins first;
// this only catches the remaining unregistered languages.
const FALLBACK_CODE_BLOCK_DESCRIPTOR: CodeBlockEditorDescriptor = {
  priority: -10,
  match: () => true,
  Editor: PlainCodeEditor,
};

// Extract image files from either clipboard or drag-and-drop payloads.
const getImageFilesFromTransfer = (
  items?: DataTransferItemList | null,
  files?: FileList | null,
) => {
  const imageFiles: File[] = [];

  Array.from(items ?? []).forEach((item) => {
    if (item.kind !== "file" || !item.type.startsWith("image/")) return;

    const file = item.getAsFile();
    if (file) imageFiles.push(file);
  });

  if (imageFiles.length > 0) return imageFiles;

  return Array.from(files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
};

// Build safe markdown image text after the upload API returns a public URL.
const createImageMarkdown = (file: File, imageUrl: string) => {
  const fallbackName = file.name.replace(/\.[^.]+$/, "").trim();
  const altText = (fallbackName || "Uploaded image").replace(/[[\]\n\r]/g, " ");

  return `![${altText}](${imageUrl})`;
};

// Render a direct image upload button that always goes through the upload API.
const UploadImageButton = ({ onUploadFiles }: MarkdownToolbarProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Upload selected local files, then reset the input so the same file can be selected again.
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) await onUploadFiles(files);

    event.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        title="Tải lên hình ảnh"
        aria-label="Tải lên hình ảnh"
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimple size={16} weight="light" />
        <span>Tải ảnh</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
};

// Render the editor toolbar with rich-text controls and code block helpers.
const MarkdownToolbar = ({ onUploadFiles }: MarkdownToolbarProps) => (
  <ConditionalContents
    options={[
      {
        when: (editor) => editor?.editorType === "codeblock",
        contents: () => <ChangeCodeMirrorLanguage />,
      },
      {
        fallback: () => (
          <>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <BoldItalicUnderlineToggles />
            <ListsToggle />
            <Separator />
            <CreateLink />
            <InsertImage />
            <UploadImageButton onUploadFiles={onUploadFiles} />
            <InsertTable />
            <InsertCodeBlock />
          </>
        ),
      },
    ]}
  />
);

// Render a reusable MDXEditor wrapper that stays synchronized with parent state.
const MarkdownEditor = forwardRef<MDXEditorMethods, MarkdownEditorProps>(
  (
    {
      value,
      onChange,
      title,
      placeholder = "Viết nội dung bài viết tại đây...",
      height = "h-[600px]",
      readOnly = false,
      className = "",
    },
    ref,
  ) => {
    const editorRef = useRef<MDXEditorMethods | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const editorMarkdown = useMemo(
      () => encodeForEditor(value || ""),
      [value],
    );

    // Apply external markdown changes without remounting the editor.
    useEffect(() => {
      if (!editorRef.current) return;

      // Compare in decoded form so non-idempotent encode/trimEnd of math blocks
      // does not trigger a spurious setMarkdown while typing inside a $$ block.
      const currentMarkdown = decodeForEditor(
        editorRef.current.getMarkdown() ?? "",
      );
      if (currentMarkdown === (value || "")) return;

      // setMarkdown rebuilds the whole document and resets scroll to the top;
      // capture and restore the scroll position to keep the view stable.
      const scroller = wrapperRef.current?.querySelector<HTMLElement>(
        ".mdxeditor-root-contenteditable",
      );
      const previousScrollTop = scroller?.scrollTop ?? 0;

      editorRef.current.setMarkdown(editorMarkdown);

      if (scroller) {
        requestAnimationFrame(() => {
          scroller.scrollTop = previousScrollTop;
        });
      }
    }, [editorMarkdown, value]);

    // Expose a live imperative bridge so the parent can read the latest markdown on save.
    useImperativeHandle(
      ref,
      () =>
        ({
          getMarkdown: () =>
            decodeForEditor(editorRef.current?.getMarkdown() ?? ""),
          setMarkdown: (nextMarkdown: string) =>
            editorRef.current?.setMarkdown(
              encodeForEditor(nextMarkdown),
            ),
          insertMarkdown: (nextMarkdown: string) =>
            editorRef.current?.insertMarkdown(
              encodeForEditor(nextMarkdown),
            ),
        } as MDXEditorMethods),
      [],
    );

    // Forward normalized markdown while keeping editor-only math code blocks out of persisted content.
    const handleEditorChange = (
      markdown: string,
      initialMarkdownNormalize = false,
    ) => {
      if (initialMarkdownNormalize) return;

      onChange(decodeForEditor(markdown));
    };

    // Upload images through the existing file service after validating size.
    const handleImageUpload = async (file: File): Promise<string> => {
      if (file.size > MAX_SIZE) {
        toast.warning("Kích thước tệp vượt quá 2MB");
        return "";
      }

      return await uploadFileImage(file, title);
    };

    // Upload pasted or dropped images and insert the returned URL as markdown.
    const uploadAndInsertImages = async (files: File[]) => {
      const uploadedMarkdown: string[] = [];

      for (const file of files) {
        try {
          const imageUrl = await handleImageUpload(file);
          if (imageUrl)
            uploadedMarkdown.push(createImageMarkdown(file, imageUrl));
        } catch {
          toast.error("Không thể tải lên hình ảnh");
        }
      }

      if (uploadedMarkdown.length === 0) return;

      editorRef.current?.insertMarkdown(
        `\n\n${uploadedMarkdown.join("\n\n")}\n\n`,
      );
    };

    // Capture mixed clipboard payloads before MDXEditor inserts a broken image node.
    const handlePasteCapture = async (
      event: ClipboardEvent<HTMLDivElement>,
    ) => {
      const files = getImageFilesFromTransfer(
        event.clipboardData?.items,
        event.clipboardData?.files,
      );

      if (files.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      await uploadAndInsertImages(files);
    };

    // Capture image drops through the same upload flow used by paste and insert.
    const handleDropCapture = async (event: DragEvent<HTMLDivElement>) => {
      const files = getImageFilesFromTransfer(
        event.dataTransfer?.items,
        event.dataTransfer?.files,
      );

      if (files.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      await uploadAndInsertImages(files);
    };

    return (
      <div
        ref={wrapperRef}
        className={`markdown-editor-wrapper border rounded-lg overflow-hidden ${height} ${className}`}
        onPasteCapture={handlePasteCapture}
        onDropCapture={handleDropCapture}
      >
        <MDXEditor
          ref={editorRef}
          markdown={editorMarkdown}
          onChange={handleEditorChange}
          // Surface silent import failures (an unhandled mdast construct aborts
          // the import, leaving the editor truncated/blank) instead of swallowing them.
          onError={({ error, source }) => {
            console.warn("[MarkdownEditor] import error:", error, { source });
          }}
          readOnly={readOnly}
          placeholder={placeholder}
          className="dark-theme h-full min-h-0 flex flex-col"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({
              imageUploadHandler: handleImageUpload,
            }),
            codeBlockPlugin({
              defaultCodeBlockLanguage: "text",
              // Catch-all so an unregistered language never aborts the import.
              codeBlockEditorDescriptors: [FALLBACK_CODE_BLOCK_DESCRIPTOR],
            }),
            codeMirrorPlugin({
              codeMirrorExtensions: [CODE_HIGHLIGHT],
              codeBlockLanguages: {
                text: "Text",
                txt: "Text",
                md: "Markdown",
                markdown: "Markdown",
                [MATH_BLOCK_LANGUAGE]: "LaTeX Math",
                js: "JavaScript",
                jsx: "JavaScript React",
                ts: "TypeScript",
                tsx: "TypeScript React",
                python: "Python",
                py: "Python",
                json: "JSON",
                css: "CSS",
                scss: "SCSS",
                html: "HTML",
                xml: "XML",
                sql: "SQL",
                bash: "Bash",
                sh: "Shell",
                shell: "Shell",
                zsh: "Shell",
                console: "Console",
                powershell: "PowerShell",
                yaml: "YAML",
                yml: "YAML",
                toml: "TOML",
                ini: "INI",
                dockerfile: "Dockerfile",
                makefile: "Makefile",
                diff: "Diff",
                graphql: "GraphQL",
                go: "Go",
                rust: "Rust",
                java: "Java",
                c: "C",
                cpp: "C++",
                "c++": "C++",
                csharp: "C#",
                cs: "C#",
                php: "PHP",
                ruby: "Ruby",
                rb: "Ruby",
                r: "R",
                kotlin: "Kotlin",
                swift: "Swift",
                dart: "Dart",
                plaintext: "Plain Text",
              },
            }),
            markdownShortcutPlugin(),
            tablePlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <MarkdownToolbar onUploadFiles={uploadAndInsertImages} />
              ),
            }),
          ]}
          contentEditableClassName="markdown-editor-content prose prose-lg max-w-none p-6"
        />
      </div>
    );
  },
);

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
