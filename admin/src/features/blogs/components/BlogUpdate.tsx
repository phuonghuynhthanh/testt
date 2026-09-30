import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { IoIosSave } from "react-icons/io";
import { toast } from "react-toastify";

import type {
  IBlogData,
  IBlogUpdateData,
  IEditorData,
} from "../../../types/Blog";
import type { IDataSeoGenerate } from "../../../types/OpenAi";
import {
  checkDuplicateBlogLink,
  getBlogDetail,
  updateBlog,
} from "../../../services/blog/handleBlog";
import {
  extractH1FromMarkdown,
  fixEscapedMarkdownSyntax,
} from "../../../utils/markdown";
import { createUrl } from "../../../utils/blogUtils";
import BlogPreviewDemo from "./BlogPreviewDemo";
import BlogBasicInfoForm from "./BlogBasicInfoForm";
import BlogSeoForm from "./BlogSeoForm";
import { PageHeader } from "../../../shared/ui";

const INIT_BLOG_DATA: IBlogData = {
  id: "",
  tag: "",
  title: "",
  banner_url: "",
  link_post: "",
  category: "",
  state: "PENDING",
  seo: {
    title: "",
    description: "",
    url: "",
    keywords: [],
    author: "",
    published_time: "",
    modified_time: "",
    banner_url: "",
  },
  content: "",
  created_at: "",
  modified_at: "",
};

// Coordinate blog update data loading, local editing state, and persistence.
const BlogUpdate = () => {
  const queryClient = useQueryClient();
  const { blog_id: blogId } = useParams<{ blog_id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [storedLinkBlog, setStoredLinkBlog] = useState("");
  const [content, setContent] = useState<IEditorData>({ title: "", body: "" });
  const [isOpenGenerate, setIsOpenGenerate] = useState(false);
  const [blogData, setBlogData] = useState<IBlogData>(INIT_BLOG_DATA);
  const [keywordInput, setKeywordInput] = useState("");
  const [openEditBlogContent, setOpenEditBlogContent] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [blogContent, setBlogContent] = useState("");
  const [dataSeoGenerate, setDataSeoGenerate] = useState<IDataSeoGenerate>({
    listSeoKey: [],
    descript: "",
  });

  const { data: blogDetail } = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId as string),
    enabled: !!blogId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Toggle markdown editor preview overlay.
  const handleClickEditBlogContent = () => setOpenEditBlogContent((prev) => !prev);

  // Close markdown preview overlay.
  const closeEditBlogContent = () => setOpenEditBlogContent(false);

  // Normalize escaped markdown syntax and update editor content.
  const handleFixMarkdownSyntax = () => {
    const fixed = fixEscapedMarkdownSyntax(blogContent);
    if (fixed === blogContent) {
      toast.info("Không tìm thấy lỗi cú pháp markdown escape.");
      return;
    }
    handleContentChange(fixed);
    toast.success("Đã sửa cú pháp markdown. Vui lòng kiểm tra lại bản xem trước trước khi lưu.");
  };

  // Sync markdown content and extract first h1 as title if present.
  const handleContentChange = (newContent: string) => {
    setBlogContent(newContent);
    const h1Title = extractH1FromMarkdown(newContent);
    if (h1Title) {
      setBlogData((prev) => ({ ...prev, title: h1Title }));
    }
  };

  // Handle input field changes including nested SEO properties.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBlogData((prev) => {
      if (name.startsWith("seo.")) {
        const seoKey = name.split(".")[1];
        return { ...prev, seo: { ...prev.seo, [seoKey]: value } };
      }
      return { ...prev, [name]: value };
    });
  };

  // Add comma-separated SEO keywords to the existing list.
  const handleAddKeyword = () => {
    const newKeywords = keywordInput
      .split(",")
      .map((kw) => kw.trim())
      .filter(Boolean);
    setBlogData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        keywords: [...new Set([...prev.seo.keywords, ...newKeywords])],
      },
    }));
    setKeywordInput("");
  };

  // Remove a single keyword from the SEO keywords array by index.
  const handleDeleteKeyword = (index: number) => {
    setBlogData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        keywords: prev.seo.keywords.filter((_, i) => i !== index),
      },
    }));
  };

  // Submit blog update payload to the backend API.
  const handleUpdate = async () => {
    const toastId = toast.loading("Đang cập nhật bài viết...");
    try {
      setIsLoading(true);
      const linkBlogPost = createUrl(blogData.title);
      const blogUpdateData: Partial<IBlogUpdateData> = {
        id: blogData.id,
        tag: blogData.tag,
        title: blogData.title,
        banner_url: blogData.banner_url,
        link_post: linkBlogPost,
        category: blogData.category,
        state: "PENDING",
        seo: {
          title: blogData.seo.title,
          description: blogData.seo.description,
          url: blogData.seo.url,
          keywords: blogData.seo.keywords,
          author: blogData.seo.author,
          banner_url: blogData.banner_url,
        },
        content: blogContent,
        created_at: blogData.created_at,
        modified_at: blogData.modified_at,
      };

      if (linkBlogPost !== storedLinkBlog) {
        const isDuplicate = await checkDuplicateBlogLink(linkBlogPost);
        if (isDuplicate) {
          alert("Tiêu đề này đã tồn tại. Vui lòng chọn tiêu đề khác.");
          setIsLoading(false);
          return;
        }
      }

      await updateBlog(blogUpdateData, bannerImage as File);
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
      toast.success("Cập nhật bài viết thành công.");
    } catch {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      toast.dismiss(toastId);
      setIsLoading(false);
    }
  };

  // Open the SEO generation modal with current title and content.
  const handleGenerateSEO = () => {
    setContent({ title: blogData.title, body: blogContent });
    setIsOpenGenerate(true);
  };

  useEffect(() => {
    if (dataSeoGenerate.listSeoKey.length > 0) {
      setBlogData((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: [
            ...new Set([...prev.seo.keywords, ...dataSeoGenerate.listSeoKey]),
          ],
          description: dataSeoGenerate.descript,
        },
      }));
    }
  }, [dataSeoGenerate]);

  useEffect(() => {
    if (blogDetail) {
      setStoredLinkBlog(blogDetail.link_post);
      setBlogData({
        ...blogDetail,
        seo: {
          ...blogDetail.seo,
          keywords: [...new Set(blogDetail.seo.keywords)],
        },
      });
      setBlogContent(blogDetail.content);
      const h1Title = extractH1FromMarkdown(blogDetail.content);
      if (h1Title) {
        setBlogData((prev) => ({ ...prev, title: h1Title }));
      }
    }
  }, [blogDetail]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Tất cả các thay đổi chưa lưu sẽ bị mất.";
      return "Tất cả các thay đổi chưa lưu sẽ bị mất.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {openEditBlogContent && (
        <BlogPreviewDemo
          tag={blogData.tag}
          title={blogData.title}
          banner={blogData.banner_url}
          content={blogContent}
          onClose={closeEditBlogContent}
          onChange={handleContentChange}
          onSave={handleUpdate}
          isLoading={isLoading}
        />
      )}

      <PageHeader
        title="Chi tiết bài viết"
        description="Chỉnh sửa thông tin cơ bản, cấu hình SEO và cập nhật nội dung bài viết"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-green hover:bg-primary-green-dark text-primary-black font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
            onClick={handleUpdate}
            disabled={isLoading}
          >
            <span>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
            <IoIosSave className="text-lg" />
          </button>
        }
      />

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border">
        <BlogBasicInfoForm
          blogData={blogData}
          bannerImage={bannerImage}
          setBannerImage={setBannerImage}
          onFieldChange={handleChange}
        />
      </div>

      <BlogSeoForm
        blogData={blogData}
        content={content}
        isOpenGenerate={isOpenGenerate}
        keywordInput={keywordInput}
        onFieldChange={handleChange}
        onGenerateSEO={handleGenerateSEO}
        onCloseGenerate={() => setIsOpenGenerate(false)}
        setDataSeoGenerate={setDataSeoGenerate}
        setKeywordInput={setKeywordInput}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
      />

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-surface-border">
          <h3 className="font-semibold text-content-primary text-base">Nội dung bài viết</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-surface-border text-cyan-400 font-medium transition-colors"
              onClick={handleClickEditBlogContent}
            >
              {!openEditBlogContent ? "Mở trình soạn thảo Markdown" : "Thu gọn trình soạn thảo"}
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium hover:bg-emerald-900/50 transition-colors"
              onClick={handleFixMarkdownSyntax}
            >
              Sửa lỗi cú pháp Markdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogUpdate;
