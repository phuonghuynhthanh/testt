import { useMemo, useState } from "react";
import { useBlog } from "../../../../context/BlogContext";

import { LuClock8, LuTrash2 } from "react-icons/lu";

import MarkdownContent from "../../../../shared/markdown/MarkdownContent";
import { slugifyText } from "../../../../utils/markdownUtil";
import type { Heading } from "../../components/TableOfContent";
import TableOfContent from "../../components/TableOfContent";
import ButtonTheme from "../../../../shared/button/ButtonTheme";
import ButtonCTA from "../../../../shared/button/ButtonCTA";
import type { IBlogData } from "../../../../types/Blog";
import { createBlogPost } from "../../../../services/blog/handleBlog";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { PATH } from "../../../../app/store";
import { resizeUntilOk } from "../../../../utils/fileUtils";

const BlogFinalPreview = () => {
  const { state, update, finish } = useBlog();
  const navigate = useNavigate();

  /* ---------- BANNER STATE ---------- */
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  /* ---------- TOC ---------- */
  const headings: Heading[] = useMemo(() => {
    const regex = /^(#{2,3})\s+(.*)$/gm;
    const matches: Heading[] = [];
    let match;

    while ((match = regex.exec(state.content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugifyText(text);
      matches.push({ id, text, level });
    }

    return matches;
  }, [state.content]);

  /* ---------- HANDLE BANNER ---------- */
  const handleSelectBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsResizing(true);
      toast.info("Checking and optimizing image...");

      if (file.size > 4 * 1024 * 1024) {
        const resized = await resizeUntilOk(file);

        if (!resized) {
          toast.error("Unable to optimize image under 4MB.");
          return;
        }

        file = resized;
      }

      setBannerFile(file);
      setPreview(URL.createObjectURL(file));
      toast.success("Banner image ready.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process banner image.");
    } finally {
      setIsResizing(false);
    }
  };

  /* ---------- REMOVE BANNER ---------- */
  const handleRemoveBanner = () => {
    setBannerFile(null);
    setPreview(null);

    const input = document.getElementById(
      "bannerInput",
    ) as HTMLInputElement | null;
    if (input) input.value = "";

    toast.info("Banner image removed.");
  };

  /* ---------- UPLOAD BLOG ---------- */
  const handleUploadBlog = async () => {
    if (!bannerFile) {
      toast.error("Please select a banner image.");
      return;
    }

    try {
      const blogData: IBlogData = {
        id: crypto.randomUUID(),
        tag: state.tag,
        title: state.title,
        banner_url: "",
        link_post: state.link_post,
        category: state.category,
        seo: state.seo,
        content: state.content,
        state: "PENDING",
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      await createBlogPost(blogData, bannerFile);

      toast.success("Blog published successfully!");
      finish();
      navigate(PATH.BLOG);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to publish blog. Please try again.");
    }
  };

  return (
    <div className="font-markdown h-full prose prose-a:no-underline max-w-none bg-primary-black p-5">
      <h2 className="text-xl font-semibold mb-4 text-primary-white">
        Blog Preview
      </h2>

      <div className="flex justify-between mb-4">
        <ButtonTheme
          variant="outline"
          onClick={() => update({ currentStep: state.currentStep - 1 })}
          disabled={isResizing}
        >
          Back
        </ButtonTheme>

        <ButtonCTA onClick={handleUploadBlog} disabled={isResizing}>
          {isResizing ? "Processing image..." : "Publish Blog"}
        </ButtonCTA>
      </div>

      {/* ---------- BANNER ---------- */}
      <div className="mb-6 flex flex-col">
        <label className="text-primary-white block mb-2">Banner image</label>

        <input
          id="bannerInput"
          type="file"
          accept="image/*"
          onChange={handleSelectBanner}
          className="hidden"
          disabled={isResizing}
        />

        <div className="flex items-center gap-3">
          <label
            htmlFor="bannerInput"
            className={`
              inline-flex items-center gap-2
              px-4 py-2 rounded-lg
              border border-gray-500
              transition
              text-primary-white
              ${isResizing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            📁 {isResizing ? "Resizing image..." : "Select banner"}
          </label>

          {preview && (
            <button
              onClick={handleRemoveBanner}
              disabled={isResizing}
              className="inline-flex items-center gap-2 px-3 py-2
                         text-red-400 border border-red-400 rounded-lg
                         hover:bg-red-400/5  transition"
            >
              <LuTrash2 className="size-4" />
              Remove
            </button>
          )}
        </div>

        {isResizing && (
          <p className="mt-2 text-sm text-yellow-400 animate-pulse">
            ⏳ Resizing image, please wait...
          </p>
        )}

        {preview && (
          <img
            src={preview}
            alt="Banner preview"
            className="mt-4 rounded-xl w-full max-h-80 object-cover border border-gray-700"
          />
        )}
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="w-full flex flex-col">
        <div className="flex-1">
          <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-10">
            <div className="xl:hidden mb-6 max-w-6xl mx-auto">
              <TableOfContent headings={headings} isVietnamese={false} />
            </div>

            <div className="flex max-w-6xl mx-auto gap-8">
              <div className="flex-1 pr-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-primary-green font-semibold mb-3">
                  {state.title}
                </h1>

                <div className="flex items-center gap-2 text-sm text-primary">
                  <LuClock8 className="size-4" />
                  <span>Today</span>
                  <span className="h-4 w-[2px] bg-gray-300" />
                  <span>{state.tag}</span>
                </div>

                <div className="h-px w-full bg-gray-300 my-4" />

                <MarkdownContent content={state.content} />
              </div>

              <aside className="hidden xl:block w-80">
                <div className="sticky top-10">
                  <TableOfContent headings={headings} isVietnamese={false} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogFinalPreview;
