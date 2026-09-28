import React, { useRef, useEffect, useState } from "react";
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  // imagePlugin,
  markdownShortcutPlugin,
  tablePlugin,
  toolbarPlugin,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertImage,
  InsertTable,
  UndoRedo,
  Separator,
  ListsToggle,
  imagePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "../../../../styles/MarkdownEditor.css";
import { RiGeminiFill } from "react-icons/ri";
import ButtonCTA from "../../../../shared/button/ButtonCTA";
import AIPopup from "./AIPopup";
import { toast } from "react-toastify";
import { uploadFileImage } from "../../../../services/file/handleFile";

const MAX_SIZE = 2 * 1024 * 1024;

interface MarkdownBlogAIEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  height?: string;
  title: string;
  readOnly?: boolean;
  className?: string;
}

// Toolbar - blog-focused
const MarkdownToolbar = () => (
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
    <InsertTable />
  </>
);

const MarkdownBlogAIEditor: React.FC<MarkdownBlogAIEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your blog post here...",
  height = "h-[600px]",
  readOnly = false,
  title,
  className = "",
}) => {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [openAI, setOpenAI] = useState(false);

  // Track object URLs to prevent memory leaks
  const objectUrlMap = useRef<Map<File, string>>(new Map());

  // Sync prop value → editor
  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlMap.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.current.clear();
    };
  }, []);

  const handleImageUpload = async (file: File): Promise<string> => {
    if (file.size > MAX_SIZE) {
      toast.warning("File size exceeds 2MB");
      return "";
    }

    return await uploadFileImage(file, title);
  };

  return (
    <div
      className={`markdown-editor-wrapper relative border rounded-lg overflow-hidden ${height} ${className}`}
    >
      <MDXEditor
        ref={editorRef}
        markdown={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className="h-full min-h-0 flex flex-col"
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

          markdownShortcutPlugin(),
          tablePlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <div className="flex items-center justify-between w-full">
                {/* BÊN TRÁI: toolbar mặc định */}
                <div className="flex items-center gap-2">
                  <MarkdownToolbar />
                </div>

                {/* BÊN PHẢI: nút custom */}
                <ButtonCTA onClick={() => setOpenAI((prev) => !prev)}>
                  <RiGeminiFill />
                </ButtonCTA>
              </div>
            ),
          }),
        ]}
        contentEditableClassName="markdown-editor-content prose prose-lg max-w-none p-6"
      />
      {openAI && (
        <AIPopup
          content={value}
          onChange={onChange}
          onClose={() => setOpenAI(false)}
        />
      )}
    </div>
  );
};

export default MarkdownBlogAIEditor;
