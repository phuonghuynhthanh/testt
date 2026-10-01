import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsStars, BsFileEarmarkText } from "react-icons/bs";
import { FiUpload, FiSend, FiSave } from "react-icons/fi";
import { toast } from "react-toastify";
import { createUrl } from "../../../utils/blogUtils";
import { apiErrorMessage } from "../../../types/Api";
import type { IBlogData, SEO } from "../../../types/Blog";
import type { LinkedInMode } from "../../../types/Publication";
import { createBlogPost, generateBlogDraft } from "../../../services/blog/handleBlog";
import { updatePublication, publishBlog } from "../../../services/publication/handlePublication";
import { createCategory, listCategories } from "../../../services/category/handleCategory";
import { PageHeader, SectionHeading, ConfirmDialog, BottomActionBar } from "../../../shared/ui";
import BlogSeoCollapse from "./BlogSeoCollapse";
import BlogCreatePublicationSection from "./BlogCreatePublicationSection";
import BlogContentEditorCard from "./BlogContentEditorCard";

const EMPTY_BLOG: IBlogData = {
  tag: "",
  title: "",
  banner_url: "",
  link_post: "",
  category: "",
  content: "",
  seo: {
    title: "",
    description: "",
    url: "",
    keywords: [],
    author: "VietQuant",
  },
};

class BlogCreationFollowupError extends Error {
  createdId: string;

  // Preserve the created Blog ID when configuration or publication fails afterward.
  constructor(createdId: string, message: string) {
    super(message);
    this.name = "BlogCreationFollowupError";
    this.createdId = createdId;
  }
}

// Render the blog creation editor supporting manual authoring, AI draft generation, and SEO fields.
const BlogCreate: React.FC = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [source, setSource] = useState<"manual" | "ai">("manual");
  const [blog, setBlog] = useState<IBlogData>(EMPTY_BLOG);
  const [image, setImage] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [publishWeb, setPublishWeb] = useState(true);
  const [publishLinkedin, setPublishLinkedin] = useState(false);
  const [linkedinMode, setLinkedinMode] = useState<LinkedInMode>("SAME");
  const [includeWebLink, setIncludeWebLink] = useState(false);

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });
  const categoryName = blog.category.trim();
  const categoryExists = categories.data?.items.some(
    (item) => item.name.trim().toLocaleLowerCase("vi-VN") === categoryName.toLocaleLowerCase("vi-VN"),
  );

  const createCategoryMutation = useMutation({
    mutationFn: () => createCategory(categoryName),
    onSuccess: async (category) => {
      updateBlog("category", category.name);
      await client.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Đã tạo danh mục “${category.name}”.`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Update a top-level blog field.
  const updateBlog = <K extends keyof IBlogData>(field: K, value: IBlogData[K]) => {
    setBlog((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  // Update an individual SEO metadata field.
  const updateSeo = <K extends keyof SEO>(field: K, value: SEO[K]) => {
    setBlog((current) => ({ ...current, seo: { ...current.seo, [field]: value } }));
    setDirty(true);
  };

  // Synchronize title changes with post slug and SEO title.
  const updateTitle = (title: string) => {
    setBlog((current) => ({
      ...current,
      title,
      link_post: !current.link_post || current.link_post === createUrl(current.title)
        ? createUrl(title)
        : current.link_post,
      seo: {
        ...current.seo,
        title: !current.seo.title || current.seo.title === current.title
          ? title
          : current.seo.title,
      },
    }));
    setDirty(true);
  };

  const draft = useMutation({
    mutationFn: () => generateBlogDraft(blog.title, blog.category),
    onSuccess: (data) => {
      setBlog((current) => ({
        ...current,
        ...data,
        banner_url: data.banner_url ?? current.banner_url,
        seo: { ...current.seo, ...data.seo },
      }));
      setDirty(true);
      setConfirmRegenerate(false);
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const save = useMutation({
    mutationFn: async (action: "SAVE_PENDING" | "PUBLISH_NOW") => {
      const created = await createBlogPost(
        { ...blog, link_post: blog.link_post.trim() || createUrl(blog.title) },
        image,
        "SAVE_PENDING"
      );
      if (created?.id) {
        try {
          await updatePublication(created.id, {
            publishWeb,
            publishLinkedin,
            linkedinMode,
            linkedinIncludeWebLink: includeWebLink,
          });
          if (action === "PUBLISH_NOW") {
            await publishBlog(created.id);
          }
        } catch (error) {
          throw new BlogCreationFollowupError(created.id, apiErrorMessage(error));
        }
      }
      return { created, action };
    },
    onSuccess: ({ created, action }) => {
      toast.success(action === "PUBLISH_NOW" ? "Đã xuất bản bài viết." : "Đã lưu bài viết chờ duyệt.");
      setDirty(false);
      setConfirmPublish(false);
      client.invalidateQueries({ queryKey: ["blogs"] });
      client.invalidateQueries({ queryKey: ["categories"] });
      if (created?.id) {
        navigate(`/blog/default/${created.id}`);
      }
    },
    onError: (error) => {
      setConfirmPublish(false);
      if (error instanceof BlogCreationFollowupError) {
        setDirty(false);
        client.invalidateQueries({ queryKey: ["blogs"] });
        toast.error(`Bài viết đã được lưu nhưng chưa hoàn tất cấu hình xuất bản: ${error.message}`);
        navigate(`/blog/default/${error.createdId}`);
        return;
      }
      toast.error(apiErrorMessage(error));
    },
  });

  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);

  // Request confirmation before overwriting existing content with AI draft.
  const handleRegenerateClick = () => {
    if (blog.content.trim()) setConfirmRegenerate(true);
    else draft.mutate();
  };

  // Keep at least one publication channel selected while creating a Blog.
  const handleToggleWeb = () => {
    if (publishWeb && !publishLinkedin) return;
    setPublishWeb((current) => !current);
    if (publishWeb) setIncludeWebLink(false);
    setDirty(true);
  };

  // Enable LinkedIn configuration without exposing actions that require a persisted Blog ID.
  const handleToggleLinkedin = () => {
    if (publishLinkedin && !publishWeb) return;
    setPublishLinkedin((current) => !current);
    if (publishLinkedin) setIncludeWebLink(false);
    setDirty(true);
  };

  // Store the LinkedIn content mode as part of the unsaved creation form.
  const handleLinkedinModeChange = (mode: LinkedInMode) => {
    setLinkedinMode(mode);
    setDirty(true);
  };

  // Store whether the future LinkedIn post should include the canonical Web link.
  const handleWebLinkToggle = (checked: boolean) => {
    setIncludeWebLink(checked);
    setDirty(true);
  };

  const formValid = Boolean(blog.title.trim() && blog.category.trim() && blog.content.trim());

  return (
    <section className="space-y-6 max-w-5xl mx-auto pb-40 sm:pb-28">
      <PageHeader
        title="Tạo bài viết mới"
        description="Soạn thảo bài viết mới hoặc tạo nhanh bản nháp thông minh bằng trợ lý AI"
      />

      {/* Keep primary actions visible throughout the page scroll. */}
      <BottomActionBar>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-content-primary">
            {formValid ? "Bài viết đã sẵn sàng" : "Đang soạn thảo bài viết"}
          </span>
          <span className="text-content-muted">·</span>
          <span className="text-content-muted">
            {publishWeb && publishLinkedin
              ? "Kênh: Web & LinkedIn"
              : publishLinkedin
              ? "Kênh: LinkedIn"
              : publishWeb
              ? "Kênh: Website"
              : "Chưa chọn kênh"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            title={save.isPending ? "Đang lưu" : "Lưu chờ duyệt"}
            aria-label={save.isPending ? "Đang lưu" : "Lưu chờ duyệt"}
            disabled={!formValid || save.isPending}
            onClick={() => save.mutate("SAVE_PENDING")}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2.5 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
          >
            <FiSave className={`text-sm ${save.isPending ? "animate-pulse" : ""}`} />
            <span>{save.isPending ? "Đang lưu..." : "Lưu chờ duyệt"}</span>
          </button>

          <button
            type="button"
            title={publishLinkedin ? "Hãy lưu bài viết trước để hoàn thiện nội dung LinkedIn" : "Xuất bản Website ngay"}
            aria-label={publishLinkedin ? "Lưu bài viết trước khi xuất bản LinkedIn" : "Xuất bản Website ngay"}
            disabled={!formValid || save.isPending || !publishWeb || publishLinkedin}
            onClick={() => setConfirmPublish(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-green px-4 py-2.5 text-xs font-semibold text-primary-black shadow-md transition-colors hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiSend className="text-sm" />
            <span>Xuất bản ngay</span>
          </button>
        </div>
      </BottomActionBar>

      <div className="flex w-fit gap-1 rounded-xl border border-surface-border bg-surface-card p-1">
        <button
          type="button"
          title="Viết thủ công"
          aria-label="Viết thủ công"
          onClick={() => setSource("manual")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
            source === "manual"
              ? "bg-surface-elevated text-primary-green border border-primary-green/30 shadow-sm"
              : "text-content-secondary hover:text-content-primary"
          }`}
        >
          <BsFileEarmarkText className="text-sm" />
          <span>Viết thủ công</span>
        </button>
        <button
          type="button"
          title="Tạo bản nháp bằng AI"
          aria-label="Tạo bản nháp bằng AI"
          onClick={() => setSource("ai")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
            source === "ai"
              ? "bg-surface-elevated text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-content-secondary hover:text-content-primary"
          }`}
        >
          <BsStars className="text-sm text-purple-400" />
          <span>Trợ lý AI</span>
        </button>
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Thông tin cơ bản" description="Tiêu đề, thể loại và định danh bài viết" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-content-secondary mb-1.5">
              Tiêu đề bài viết <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={blog.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">
              Danh mục <span className="text-rose-400">*</span>
            </label>
            <input
              list="blog-create-categories"
              value={blog.category}
              onChange={(e) => updateBlog("category", e.target.value)}
              placeholder="Chọn hoặc nhập danh mục mới..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
            <datalist id="blog-create-categories">
              {categories.data?.items.map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
            {categoryName && !categoryExists && (
              <button
                type="button"
                disabled={createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary-green/30 bg-primary-green/10 px-3 py-1.5 text-xs font-semibold text-primary-green transition-colors hover:bg-primary-green/15 disabled:opacity-50"
              >
                <span>{createCategoryMutation.isPending ? "Đang tạo danh mục..." : `+ Tạo danh mục “${categoryName}”`}</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Thẻ Tag</label>
            <input
              type="text"
              value={blog.tag}
              onChange={(e) => updateBlog("tag", e.target.value)}
              placeholder="Ví dụ: Tài chính, AI, Machine Learning..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Đường dẫn bài viết (Slug)</label>
            <input
              type="text"
              value={blog.link_post}
              onChange={(e) => updateBlog("link_post", e.target.value)}
              placeholder="duong-dan-bai-viet"
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
        </div>

      </div>

      {/* Section 2: Ảnh bìa bài viết (moved right after Thông tin cơ bản) */}
      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-3">
        <SectionHeading title="Ảnh bìa bài viết" description="Tải lên tệp ảnh (JPEG, PNG, WebP) - Tùy chọn" />
        <div className="flex items-center gap-3">
          <label
            title={image ? `Đổi ảnh bìa: ${image.name}` : "Chọn ảnh bìa"}
            aria-label={image ? `Đổi ảnh bìa: ${image.name}` : "Chọn ảnh bìa"}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
          >
            <FiUpload className="text-sm" />
            <span>{image ? "Đổi ảnh bìa" : "Chọn ảnh bìa"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => { setImage(e.target.files?.[0] ?? null); setDirty(true); }}
              className="hidden"
            />
          </label>
          {image && (
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Gỡ ảnh
            </button>
          )}
        </div>
      </div>

      {/* Section 3: Nội dung bài viết với các chế độ Soạn thảo / Markdown / Xem trước */}
      <BlogContentEditorCard
        content={blog.content}
        title={blog.title}
        onChange={(val) => updateBlog("content", val)}
        showAiButton={source === "ai"}
        isAiPending={draft.isPending}
        onAiGenerate={handleRegenerateClick}
        canAiGenerate={Boolean(blog.title.trim() && blog.category.trim())}
      />

      {/* Section 4: Cấu hình SEO */}
      <BlogSeoCollapse seo={blog.seo} onUpdateSeo={updateSeo} />

      {/* Section 5: Cấu hình xuất bản & Phân phối */}
      <BlogCreatePublicationSection
        publishWeb={publishWeb}
        publishLinkedin={publishLinkedin}
        mode={linkedinMode}
        includeWebLink={includeWebLink}
        onToggleWeb={handleToggleWeb}
        onToggleLinkedin={handleToggleLinkedin}
        onChangeMode={handleLinkedinModeChange}
        onToggleWebLink={handleWebLinkToggle}
      />

      <ConfirmDialog
        isOpen={confirmRegenerate}
        title="Ghi đè nội dung bằng AI?"
        message="Nội dung bài viết hiện tại sẽ bị thay thế bằng bản nháp mới do AI sinh ra. Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Tiếp tục tạo lại"
        cancelLabel="Hủy bỏ"
        variant="primary"
        isLoading={draft.isPending}
        onConfirm={() => draft.mutate()}
        onCancel={() => setConfirmRegenerate(false)}
      />

      <ConfirmDialog
        isOpen={confirmPublish}
        title="Xác nhận xuất bản bài viết"
        message="Bài viết sẽ được lưu và xuất bản công khai ngay lên Website VietQuant."
        confirmLabel="Xuất bản ngay"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={save.isPending}
        onConfirm={() => save.mutate("PUBLISH_NOW")}
        onCancel={() => setConfirmPublish(false)}
      />
    </section>
  );
};

export default BlogCreate;
