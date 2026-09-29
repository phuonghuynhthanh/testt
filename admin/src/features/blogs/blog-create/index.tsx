import { useState, useEffect } from "react";
import { FaArrowAltCircleRight, FaPlay } from "react-icons/fa";
import { MdEdit, MdCode, MdPreview } from "react-icons/md";

import { IoCreateOutline } from "react-icons/io5";

import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import type { BlogCategory, IBlogData } from "../../../types/Blog";
import type { BlogPreviewMode } from "../components/HeaderActionButton";
import { createUrl } from "../../../utils/blogUtils";
import {
  categories,
  checkDuplicateBlogLink,
  createBlogPost,
} from "../../../services/blog/handleBlog";
import BlogPreview from "../components/BlogPreview";
import InputField from "../../../shared/input/InputField";
import SelectField from "../../../shared/select/SelectField";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";
import TextareaField from "../../../shared/input/TextareaField";
import SeoEditor from "../components/SeoEditor";

interface IBlogSEO {
  tag: string;
  title: string;
  bannerUrl: string;
  seoKeywords: string[];
  seoTitle: string;
  seoDescription: string;
}

const BlogCreate = () => {
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [linkBlogPost, setLinkBlogPost] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [content, setContent] = useState({ title: "", body: "" });
  const [blogTitle, setBlogTitle] = useState<string>("");
  const [category, setCategory] = useState<BlogCategory>("INVESTMENT_INSIGHTS");
  const [editorMode, setEditorMode] = useState<BlogPreviewMode>("edit");
  const [isValidLinkBlogPost, setIsValidLinkBlogPost] =
    useState<boolean>(false);
  const [blogSeo, setBlogSeo] = useState<IBlogSEO>({
    tag: "",
    title: "",
    bannerUrl: "",
    seoKeywords: [""],
    seoTitle: "",
    seoDescription: "",
  });

  const resetData = () => {
    setCurrentStep(1);
    setBlogSeo({
      tag: "",
      title: "",
      bannerUrl: "",
      seoKeywords: [""],
      seoTitle: "",
      seoDescription: "",
    });
    setMarkdownContent("");
    setCategory("INVESTMENT_INSIGHTS");
    setContent({ title: "", body: "" });
    setBannerImage(null);
    setLinkBlogPost("");
    setIsValidLinkBlogPost(false);
  };

  const handleClickBlogPostPreview = () => {
    setContent({
      title: blogTitle,
      body: markdownContent,
    });
    setShowPreview(true);
  };

  const closePreview = () => setShowPreview(false);

  const handleClickNextStep = () => {
    if (currentStep === 1) {
      if (!isValidLinkBlogPost) {
        toast.info("Please check the valid title.");
        return;
      }
      if (!markdownContent.trim()) {
        toast.info("Blog content cannot be empty.");
        return;
      }

      setContent({ title: blogTitle, body: markdownContent });
      setCurrentStep((current: number) => current + 1);
      return;
    }

    if (currentStep === 2) {
      handleCreateNewBlog();
      return;
    }
  };

  const handleClickPreStep = () => {
    setCurrentStep((current: number) => current - 1);
  };

  const handleSeoDataChange = (updatedData: IBlogSEO) => {
    setBlogSeo(updatedData);
  };

  const isValidBlogData = (): boolean => {
    if (!bannerImage) {
      toast.info("Please provide a banner for the blog post.");
      return false;
    }
    if (!blogSeo.tag) {
      toast.info("Please select a tag for the blog post.");
      return false;
    }
    if (!blogSeo.title) {
      toast.info("Please enter a title for the blog post.");
      return false;
    }

    return true;
  };

  const handleCreateNewBlog = async () => {
    if (!isValidBlogData()) {
      console.log("false");

      return;
    }
    const loadingToastId = toast.loading("Creating...");
    try {
      const id = crypto.randomUUID();
      const linkBlogPost = createUrl(blogSeo.title);
      const newBlog: IBlogData = {
        id: id,
        tag: blogSeo.tag,
        title: blogSeo.title,
        banner_url: "",
        link_post: linkBlogPost,
        category: category,
        state: "PENDING",
        seo: {
          title: blogSeo.seoTitle,
          description: blogSeo.seoDescription,
          url: linkBlogPost,
          keywords: blogSeo.seoKeywords,
          author: "Vietnam Business Brokers",
          banner_url: "",
        },
        content: content.body,
        created_at: "",
        modified_at: "",
      };

      await createBlogPost(newBlog, bannerImage as File);
      toast.update(loadingToastId, {
        render: "Create successful.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({
        queryKey: ["blogs"],
      });
      resetData();
    } catch (error) {
      toast.update(loadingToastId, {
        render: `${error}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleChangeTitle = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setBlogTitle(e.target.value);
    const newLink = createUrl(e.target.value);
    setLinkBlogPost(newLink);
    setIsValidLinkBlogPost(false);
  };

  const handleCheckDuplicateBlogLink = async () => {
    if (!blogTitle.trim()) {
      toast.info("Blog title cannot be empty.");
      return;
    }
    const isDuplicate = await checkDuplicateBlogLink(linkBlogPost);
    if (isDuplicate) {
      toast.error(
        "This title is already taken. Please choose a different one.",
      );
      setIsValidLinkBlogPost(false);
    } else {
      toast.success("Title is available. You can create a new blog post.");
      setIsValidLinkBlogPost(true);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: {
      preventDefault: () => void;
      returnValue: string;
    }) => {
      event.preventDefault();
      event.returnValue =
        "All unsaved changes will be lost. Are you sure you want to leave?";
      return "All unsaved changes will be lost. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-10">
      {showPreview && (
        <BlogPreview
          // Pass the raw content object directly.
          tag="NEW BIE"
          title={content.title}
          banner=""
          content={content.body}
          onClose={closePreview}
        />
      )}
      {currentStep === 1 && (
        <>
          <div className="flex flex-col">
            <button
              onClick={handleClickBlogPostPreview}
              className="text-xl h-max w-max px-6 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg font-semibold text-white mt-8"
            >
              Preview <FaPlay className="inline ml-2" />
            </button>
            <div className="h-[1px] w-full bg-gray-300 my-4"></div>
          </div>
          <div className="h-max">
            <div className="flex gap-2 items-end">
              <InputField
                label="Blog Title"
                id="title"
                name="title"
                placeholder="Enter blog title"
                value={blogTitle}
                handleChange={handleChangeTitle}
              />
              <button
                onClick={handleCheckDuplicateBlogLink}
                className="px-3 py-2 h-max bg-primary-green text-primary-black rounded-md hover:bg-blue-600 shrink-0"
              >
                <span>Check valid title</span>
              </button>
            </div>
            <SelectField
              label="Category"
              id="category"
              name="category"
              value={category}
              options={categories.filter((cat) => cat.value !== "ALL")}
              onChange={(e) => setCategory(e.target.value as BlogCategory)}
            />
            <hr className="my-10" />
            {isValidLinkBlogPost && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-primary-white font-semibold text-lg">
                    Blog Content
                  </label>
                  {/* Segmented mode toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setEditorMode("edit")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm ${
                        editorMode === "edit"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "bg-transparent text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <MdEdit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("markdown")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm ${
                        editorMode === "markdown"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "bg-transparent text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <MdCode className="w-4 h-4" />
                      <span>Markdown</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("preview")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm ${
                        editorMode === "preview"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "bg-transparent text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      <MdPreview className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {editorMode === "edit" && (
                  <MarkdownEditor
                    value={markdownContent}
                    title={blogTitle}
                    onChange={setMarkdownContent}
                    height="h-96"
                    placeholder="Start writing your blog post using Markdown..."
                  />
                )}
                {editorMode === "markdown" && (
                  <TextareaField
                    label=""
                    id="blog-markdown-content"
                    name="blog-markdown-content"
                    value={markdownContent}
                    handleChange={(e) => setMarkdownContent(e.target.value)}
                    placeholder="Start writing your blog post using Markdown..."
                    rows={24}
                  />
                )}
                {editorMode === "preview" && (
                  <div className="font-markdown prose prose-a:no-underline max-w-none border border-gray-300 rounded-lg p-6 min-h-96 bg-primary-black">
                    {markdownContent.trim() ? (
                      <MarkdownContent content={markdownContent} />
                    ) : (
                      <p className="text-gray-400 italic">
                        No content to preview yet...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <SeoEditor
          onSeoDataChange={handleSeoDataChange}
          blogTitle={content.title}
          blogContent={content.body}
          bannerImage={bannerImage}
          setBannerImage={setBannerImage}
        />
      )}

      <div className="flex justify-between items-center">
        <button
          className={`${
            currentStep === 1 ? "invisible" : "visible"
          } text-xl h-max w-max px-6 py-2.5 bg-orange-500 hover:bg-orange-500/90 rounded-lg font-semibold text-white mt-8 self-end`}
          onClick={handleClickPreStep}
        >
          Back
        </button>
        <button
          className="h-max w-max px-6 py-2.5 bg-primary-green hover:bg-primary-green-dark rounded-lg font-semibold text-primary-black mt-8 self-end flex items-center gap-2"
          onClick={handleClickNextStep}
        >
          <span className="text-xl">
            {currentStep === 1 ? "Next Step" : "Create Blog"}
          </span>
          {currentStep === 1 ? (
            <FaArrowAltCircleRight className="text-2xl" />
          ) : (
            <IoCreateOutline className="text-2xl" />
          )}
        </button>
      </div>
    </div>
  );
};

export default BlogCreate;
