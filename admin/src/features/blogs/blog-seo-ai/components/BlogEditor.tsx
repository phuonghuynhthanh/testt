import { useBlog } from "../../../../context/BlogContext";
import { splitSections } from "../../../../utils/markdownUtil";
import MarkdownBlogAIEditor from "./MarkdownBlogAIEditor";
import ButtonTheme from "../../../../shared/button/ButtonTheme";

const BlogEditor = () => {
  const { state, update } = useBlog();

  const blogContentParts = splitSections(state.content);

  const handleUpdateContent = (updatedContent: string) => {
    update({ content: updatedContent });
  };

  return (
    <div className="p-4 flex  flex-col gap-6 bg-primary-black text-primary-white rounded-lg">
      <h2 className="text-xl font-semibold">Chỉnh sửa bài viết</h2>
      {blogContentParts.map((part, index) => (
        <div key={index}>
          <MarkdownBlogAIEditor
            value={part}
            title={state.title}
            onChange={(content) => {
              const updatedContentParts = blogContentParts.map((part, i) => {
                if (i === index) {
                  return content;
                }
                return part;
              });
              const updatedContent = updatedContentParts.join("\n");
              handleUpdateContent(updatedContent);
            }}
            height="h-[200px]"
            placeholder="Start writing your blog post using Markdown..."
          />
        </div>
      ))}
      <div className="flex w-full justify-between">
        <ButtonTheme
          variant="outline"
          onClick={() => update({ currentStep: state.currentStep - 1 })}
        >
          Back
        </ButtonTheme>
        <ButtonTheme
          variant="green"
          onClick={() => update({ currentStep: state.currentStep + 1 })}
        >
          Next
        </ButtonTheme>
      </div>
    </div>
  );
};

export default BlogEditor;
