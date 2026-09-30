import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsStars, BsFileEarmarkText } from "react-icons/bs";
import { FiUpload, FiSend, FiSave } from "react-icons/fi";
import { toast } from "react-toastify";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import { createUrl } from "../../../utils/blogUtils";
import { apiErrorMessage } from "../../../types/Api";
import type { IBlogData, SEO } from "../../../types/Blog";
import { createBlogPost, generateBlogDraft } from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { PageHeader, SectionHeading, ConfirmDialog } from "../../../shared/ui";

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

// Render the blog creation editor supporting manual authoring, AI draft generation, and SEO fields.
const BlogCreate: React.FC = () => {
  const client = useQueryClient();
  const [source, setSource] = useState<"manual" | "ai">("manual");
  const [blog, setBlog] = useState<IBlogData>(EMPTY_BLOG);
  const [image, setImage] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
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
    mutationFn: (action: "SAVE_PENDING" | "PUBLISH_NOW") =>
      createBlogPost(
        { ...blog, link_post: blog.link_post.trim() || createUrl(blog.title) },
        image,
        action
      ),
    onSuccess: (_, action) => {
      toast.success(action === "PUBLISH_NOW" ? "Đã xuất bản website." : "Đã lưu chờ duyệt.");
      setDirty(false);
      setConfirmPublish(false);
      client.invalidateQueries({ queryKey: ["blogs"] });
      client.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
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

  const formValid = Boolean(blog.title.trim() && blog.category.trim() && blog.content.trim());

  return (
    <section className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Tạo bài viết mới"
        description="Soạn thảo bài viết mới hoặc tạo nhanh bản nháp thông minh bằng trợ lý AI"
      />

      <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-surface-border bg-surface-card p-1 sm:flex sm:w-fit">
        <button
          type="button"
          onClick={() => setSource("manual")}
          className={`flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold transition-colors sm:px-4 ${
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
          onClick={() => setSource("ai")}
          className={`flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold transition-colors sm:px-4 ${
            source === "ai"
              ? "bg-surface-elevated text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-content-secondary hover:text-content-primary"
          }`}
        >
          <BsStars className="text-sm text-purple-400" />
          <span>Tạo bản nháp bằng AI</span>
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

        {source === "ai" && (
          <div className="pt-2">
            <button
              type="button"
              disabled={!blog.title.trim() || !blog.category.trim() || draft.isPending}
              onClick={handleRegenerateClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <BsStars className="text-sm text-purple-400" />
              <span>{draft.isPending ? "Đang tạo bản nháp bằng AI..." : blog.content ? "Tạo lại bằng AI" : "Tạo bản nháp AI ngay"}</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Nội dung bài viết" description="Định dạng Markdown tiêu chuẩn" />
        <MarkdownEditor
          value={blog.content}
          title={blog.title}
          onChange={(val) => updateBlog("content", val)}
          height="h-96"
          placeholder="Soạn thảo nội dung bài viết bằng Markdown..."
        />
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Cấu hình SEO" description="Tối ưu thẻ tìm kiếm cho bài viết" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Tiêu đề SEO</label>
            <input
              type="text"
              value={blog.seo.title}
              onChange={(e) => updateSeo("title", e.target.value)}
              placeholder="Nhập tiêu đề SEO..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Mô tả SEO</label>
            <textarea
              rows={3}
              value={blog.seo.description}
              onChange={(e) => updateSeo("description", e.target.value)}
              placeholder="Nhập mô tả tóm tắt..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition resize-y"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-content-secondary mb-1.5">URL SEO</label>
            <input
              type="text"
              value={blog.seo.url}
              onChange={(e) => updateSeo("url", e.target.value)}
              placeholder="https://vietquant.vn/duong-dan-bai-viet"
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Từ khóa SEO (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              value={blog.seo.keywords.join(", ")}
              onChange={(e) => updateSeo("keywords", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
              placeholder="keyword 1, keyword 2..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Tác giả</label>
            <input
              type="text"
              value={blog.seo.author}
              onChange={(e) => updateSeo("author", e.target.value)}
              placeholder="VietQuant"
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-3">
        <SectionHeading title="Ảnh bìa bài viết" description="Tải lên tệp ảnh (JPEG, PNG, WebP) - Tùy chọn" />
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-content-secondary hover:text-content-primary border border-surface-border text-xs font-medium cursor-pointer transition-colors">
            <FiUpload className="text-sm" />
            <span>{image ? image.name : "Chọn tệp ảnh bìa"}</span>
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

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={!formValid || save.isPending}
          onClick={() => save.mutate("SAVE_PENDING")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-surface-border bg-surface-elevated hover:bg-surface-hover text-content-primary text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiSave className="text-base" />
          <span>{save.isPending ? "Đang lưu..." : "Lưu chờ duyệt"}</span>
        </button>

        <button
          type="button"
          disabled={!formValid || save.isPending}
          onClick={() => setConfirmPublish(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-green hover:bg-primary-green-dark text-primary-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          <FiSend className="text-base" />
          <span>Xuất bản Website ngay</span>
        </button>
      </div>

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
        message="Bài viết sẽ được xuất bản công khai ngay lập tức lên website VietQuant."
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
