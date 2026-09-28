import { useState, useEffect } from "react";
import { useBlog } from "../../../../context/BlogContext";
import ButtonTheme from "../../../../shared/button/ButtonTheme";
import {
  crawlDataContent,
  generateBlog,
  generateOutline,
} from "../../../../services/blog/handleBlogAI";
import ButtonCTA from "../../../../shared/button/ButtonCTA";
import type { ICrawledData, ILinkReference } from "../../../../types/Blog";
import { toast } from "react-toastify";

const BlogOutline = () => {
  const { state: blogState, update } = useBlog();
  const [isLoading, setIsLoading] = useState(false);

  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (blogState.outline?.length) {
      setText(blogState.outline.join("\n"));
    }
  }, [blogState.outline]);

  const fetchContentsFromLinks = async () => {
    if (!blogState.link_references.length) return [];

    const selectedLinks = blogState.link_references.filter(
      (link: ILinkReference) => link.is_selected,
    );

    if (!selectedLinks.length) return [];

    const results = await Promise.all(
      selectedLinks.map(async (link: ILinkReference) => {
        try {
          const res = await crawlDataContent(link.url);

          if (!res) return null;

          const text = res.text_content ?? res.content ?? null;

          if (!text) return null;

          return {
            title: link.title,
            text,
          } as ICrawledData;
        } catch (err) {
          console.error("Error fetching:", link.url, err);
          return null;
        }
      }),
    );

    return results.filter(Boolean) as ICrawledData[];
  };

  const handleGenerateOutline = async () => {
    setIsLoading(true);

    try {
      const crawlData = await fetchContentsFromLinks();
      if (!crawlData.length) {
        toast.warning(
          "No crawled data from selected links. Cannot generate outline.",
        );
        setIsLoading(false);
        return;
      }

      const outline = await generateOutline(
        blogState.seo.keywords,
        blogState.title,
        blogState.language,
        crawlData,
      );
      setText(outline.join("\n"));
      update({ outline });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBlogContent = async (outline: string[]) => {
    try {
      setIsLoading(true);
      const blogContent = await generateBlog(
        blogState.seo.keywords,
        outline,
        blogState.title,
        blogState.language,
      );
      update({ content: blogContent.content });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const cleaned = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (blogState.content.trim() === "")
      await handleGenerateBlogContent(cleaned);
    update({
      outline: cleaned,
      currentStep: blogState.currentStep + 1,
    });
  };

  return (
    <div className="p-4 flex flex-col gap-6 bg-primary-black text-primary-white rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Build blog outline content</h2>

        <ButtonCTA size="sm" onClick={handleGenerateOutline}>
          {isLoading ? "Generating..." : "Generate with AI"}
        </ButtonCTA>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-semibold">
          Use AI to generate outline content for your blog
        </label>

        <textarea
          rows={12}
          className="w-full px-4 py-3 rounded border border-gray-700 bg-transparent text-primary-white"
          placeholder="Enter your blog outline content here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="flex justify-between gap-3">
        <ButtonTheme
          variant="outline"
          onClick={() => update({ currentStep: blogState.currentStep - 1 })}
        >
          Back
        </ButtonTheme>

        <ButtonTheme
          variant="green"
          onClick={handleSave}
          disabled={!text || isLoading}
        >
          {isLoading ? "Generating..." : "Save and Continue"}
        </ButtonTheme>
      </div>
    </div>
  );
};

export default BlogOutline;
