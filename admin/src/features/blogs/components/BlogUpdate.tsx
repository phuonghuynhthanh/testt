import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { FloppyDisk, X } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import type { IBlogData, IEditorData } from "../../../types/Blog";
import type { IDataSeoGenerate } from "../../../types/OpenAi";
import { getBlogDetail, updateBlog } from "../../../services/blog/handleBlog";
import { extractH1FromMarkdown, fixEscapedMarkdownSyntax } from "../../../utils/markdown";
import BlogPreviewDemo from "./BlogPreviewDemo";
import BlogBasicInfoForm from "./BlogBasicInfoForm";
import BlogSeoForm from "./BlogSeoForm";
import { PageHeader, StatusBadge, BottomActionBar } from "../../../shared/ui";
import { apiErrorMessage } from "../../../types/Api";

const INIT_BLOG_DATA: IBlogData = {
  id: "", tag: "", title: "", banner_url: "", link_post: "", category: "", state: "PENDING",
  seo: { title: "", description: "", url: "", keywords: [], author: "", published_time: "", modified_time: "", banner_url: "" },
  content: "", created_at: "", modified_at: "",
};

// Coordinate blog update data loading, local editing state, and persistence.
const BlogUpdate = () => {
  const queryClient = useQueryClient();
  const { blog_id: blogId } = useParams<{ blog_id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<IEditorData>({ title: "", body: "" });
  const [isOpenGenerate, setIsOpenGenerate] = useState(false);
  const [blogData, setBlogData] = useState<IBlogData>(INIT_BLOG_DATA);
  const [keywordInput, setKeywordInput] = useState("");
  const [openEditBlogContent, setOpenEditBlogContent] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [blogContent, setBlogContent] = useState("");
  const [dataSeoGenerate, setDataSeoGenerate] = useState<IDataSeoGenerate>({ listSeoKey: [], descript: "" });

  const { data: blogDetail } = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId as string),
    enabled: !!blogId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Toggle or close markdown editor preview overlay.
  const handleClickEditBlogContent = () => setOpenEditBlogContent((prev) => !prev);
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
    if (h1Title) setBlogData((prev) => ({ ...prev, title: h1Title }));
  };

  // Handle input field changes including nested SEO properties.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    const newKeywords = keywordInput.split(",").map((kw) => kw.trim()).filter(Boolean);
    setBlogData((prev) => ({
      ...prev,
      seo: { ...prev.seo, keywords: [...new Set([...prev.seo.keywords, ...newKeywords])] },
    }));
    setKeywordInput("");
  };

  // Remove a single keyword from the SEO keywords array by index.
  const handleDeleteKeyword = (index: number) => {
    setBlogData((prev) => ({
      ...prev,
      seo: { ...prev.seo, keywords: prev.seo.keywords.filter((_, i) => i !== index) },
    }));
  };

  // Submit blog update payload to the backend API.
  const handleUpdate = async () => {
    if (isLoading || bannerBusy) return;
    const toastId = toast.loading("Đang cập nhật bài viết...");
    try {
      setIsLoading(true);
      const blogUpdateData = {
        id: blogData.id, tag: blogData.tag, title: blogData.title, banner_url: blogData.banner_url,
        category: blogData.category,
        seo: {
          title: blogData.seo.title, description: blogData.seo.description,
          keywords: blogData.seo.keywords, author: blogData.seo.author,
        },
        content: blogContent,
      };
      await updateBlog(blogUpdateData, bannerImage as File);
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
      toast.success("Cập nhật bài viết thành công.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
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
          keywords: [...new Set([...prev.seo.keywords, ...dataSeoGenerate.listSeoKey])],
          description: dataSeoGenerate.descript,
        },
      }));
    }
  }, [dataSeoGenerate]);

  useEffect(() => {
    if (blogDetail) {
      setBlogData({
        ...blogDetail,
        seo: { ...blogDetail.seo, keywords: [...new Set(blogDetail.seo.keywords)] },
      });
      setBlogContent(blogDetail.content);
      const h1Title = extractH1FromMarkdown(blogDetail.content);
      if (h1Title) setBlogData((prev) => ({ ...prev, title: h1Title }));
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
    <div className="space-y-6 max-w-[968px] mx-auto pb-40 sm:pb-28">
      {openEditBlogContent && (
        <BlogPreviewDemo
          tag={blogData.tag}
          title={blogData.title}
          banner={blogData.banner_url}
          content={blogContent}
          onClose={closeEditBlogContent}
          onChange={handleContentChange}
          onSave={handleUpdate}
          isLoading={isLoading || bannerBusy}
        />
      )}

      <PageHeader
        title="Chỉnh sửa bài viết"
        description="Cập nhật nội dung, ảnh bìa và SEO."
        actions={<StatusBadge status={blogData.state || "PENDING"} />}
      />

      <BottomActionBar>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">Chỉnh sửa bài viết</span>
          <span className="hidden text-content-muted sm:inline">Thay đổi chỉ được áp dụng sau khi lưu.</span>
        </div>

        <div className="flex items-center gap-3">
          {blogId && (
            <Link to={`/blog/detail/${blogId}`} className="btn btn-secondary">
              <X size={16} weight="light" />
              <span>Đóng</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleUpdate}
            disabled={isLoading || bannerBusy}
            className="btn btn-primary"
          >
            <FloppyDisk size={16} weight="light" />
            <span>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
        </div>
      </BottomActionBar>

      <div className="panel p-4">
        <BlogBasicInfoForm
          blogData={blogData}
          bannerImage={bannerImage}
          setBannerImage={setBannerImage}
          onFieldChange={handleChange}
          onBannerUse={(objectKey) => { setBannerImage(null); setBlogData((current) => ({ ...current, banner_url: objectKey })); }}
          blogContent={blogContent}
          bannerBusy={bannerBusy}
          disabled={isLoading}
          onBannerBusyChange={setBannerBusy}
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

      <div className="panel p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-3">
          <h3 className="text-base font-semibold">Nội dung bài viết</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClickEditBlogContent}
            >
              {!openEditBlogContent ? "Mở trình soạn thảo Markdown" : "Thu gọn trình soạn thảo"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-primary-green"
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
