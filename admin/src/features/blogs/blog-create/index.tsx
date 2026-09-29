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
        toast.info("Vui lòng kiểm tra tính hợp lệ của tiêu đề.");
        return;
      }
      if (!markdownContent.trim()) {
        toast.info("Nội dung bài viết không được để trống.");
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
      toast.info("Vui lòng tải lên ảnh banner cho bài viết.");
      return false;
    }
    if (!blogSeo.tag) {
      toast.info("Vui lòng chọn thẻ tag cho bài viết.");
      return false;
    }
    if (!blogSeo.title) {
      toast.info("Vui lòng nhập tiêu đề cho bài viết.");
      return false;
    }

    return true;
  };

  const handleCreateNewBlog = async () => {
    if (!isValidBlogData()) {
      console.log("false");

      return;
    }
    const loadingToastId = toast.loading("Đang tạo bài viết...");
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
        render: "Tạo bài viết thành công.",
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
      toast.info("Tiêu đề bài viết không được để trống.");
      return;
    }
    const isDuplicate = await checkDuplicateBlogLink(linkBlogPost);
    if (isDuplicate) {
      toast.error(
        "Tiêu đề này đã tồn tại. Vui lòng chọn tiêu đề khác.",
      );
      setIsValidLinkBlogPost(false);
    } else {
      toast.success("Tiêu đề khả dụng. Bạn có thể sử dụng tiêu đề này.");
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
        "Tất cả thay đổi chưa lưu sẽ bị mất. Bạn có chắc chắn muốn rời đi?";
      return "Tất cả thay đổi chưa lưu sẽ bị mất. Bạn có chắc chắn muốn rời đi?";
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
              Xem trước <FaPlay className="inline ml-2" />
            </button>
            <div className="h-[1px] w-full bg-gray-300 my-4"></div>
          </div>
          <div className="h-max">
            <div className="flex gap-2 items-end">
              <InputField
                label="Tiêu đề bài viết"
                id="title"
                name="title"
                placeholder="Nhập tiêu đề bài viết..."
                value={blogTitle}
                handleChange={handleChangeTitle}
              />
              <button
                onClick={handleCheckDuplicateBlogLink}
                className="px-3 py-2 h-max bg-primary-green text-primary-black rounded-md hover:bg-blue-600 shrink-0"
              >
                <span>Kiểm tra tiêu đề</span>
              </button>
            </div>
            <SelectField
              label="Danh mục"
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
                    Nội dung bài viết
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
                      <span>Chỉnh sửa</span>
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
                      <span>Mã Markdown</span>
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
                      <span>Xem trước</span>
                    </button>
                  </div>
                </div>

                {editorMode === "edit" && (
                  <MarkdownEditor
                    value={markdownContent}
                    title={blogTitle}
                    onChange={setMarkdownContent}
                    height="h-96"
                    placeholder="Bắt đầu viết bài viết bằng định dạng Markdown..."
                  />
                )}
                {editorMode === "markdown" && (
                  <TextareaField
                    label=""
                    id="blog-markdown-content"
                    name="blog-markdown-content"
                    value={markdownContent}
                    handleChange={(e) => setMarkdownContent(e.target.value)}
                    placeholder="Bắt đầu viết bài viết bằng định dạng Markdown..."
                    rows={24}
                  />
                )}
                {editorMode === "preview" && (
                  <div className="font-markdown prose prose-a:no-underline max-w-none border border-gray-300 rounded-lg p-6 min-h-96 bg-primary-black">
                    {markdownContent.trim() ? (
                      <MarkdownContent content={markdownContent} />
                    ) : (
                      <p className="text-gray-400 italic">
                        Chưa có nội dung để xem trước...
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
          Quay lại
        </button>
        <button
          className="h-max w-max px-6 py-2.5 bg-primary-green hover:bg-primary-green-dark rounded-lg font-semibold text-primary-black mt-8 self-end flex items-center gap-2"
          onClick={handleClickNextStep}
        >
          <span className="text-xl">
            {currentStep === 1 ? "Tiếp theo" : "Tạo bài viết"}
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
