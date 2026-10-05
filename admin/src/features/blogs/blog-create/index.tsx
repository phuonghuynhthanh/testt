import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsStars, BsFileEarmarkText } from "react-icons/bs";
import { FiSave, FiSend } from "react-icons/fi";
import { toast } from "react-toastify";
import { apiErrorMessage } from "../../../types/Api";
import type { IBlogData, SEO } from "../../../types/Blog";
import { createBlogPost, generateBlogDraft } from "../../../services/blog/handleBlog";
import { createCategory, listCategories } from "../../../services/category/handleCategory";
import { PageHeader, SectionHeading, ConfirmDialog, BottomActionBar } from "../../../shared/ui";
import BlogSeoCollapse from "./BlogSeoCollapse";
import BlogContentEditorCard from "./BlogContentEditorCard";
import CategoryCombobox from "./CategoryCombobox";
import { getSeoData } from "../../../services/openai/handleSeoGenerate";
import type { PostLanguage } from "../../../types/Language";
import { BlogBannerPicker } from "../../../shared/media/BlogBannerPicker";

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
  const navigate = useNavigate();
  const client = useQueryClient();
  const [source, setSource] = useState<"manual" | "ai">("ai");
  const [language, setLanguage] = useState<PostLanguage>("vietnamese");
  const [blog, setBlog] = useState<IBlogData>(EMPTY_BLOG);
  const [image, setImage] = useState<File | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSeo, setConfirmSeo] = useState(false);

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });
  // Create and select a category inline without leaving the unsaved article.
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(name),
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

  // Synchronize only the editable SEO title; the server allocates the slug.
  const updateTitle = (title: string) => {
    setBlog((current) => ({
      ...current,
      title,
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
    mutationFn: () => generateBlogDraft(blog.title, blog.category, language),
    // Preserve the selected banner when replacing only article copy and SEO.
    onSuccess: (data) => {
      setBlog((current) => ({
        ...current,
        ...data,
        banner_url: current.banner_url,
        seo: { ...current.seo, ...data.seo },
      }));
      setDirty(true);
      setConfirmRegenerate(false);
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Generate metadata only, preserving article content and manually entered SEO identity fields.
  const generateSeo = useMutation({
    mutationFn: () => getSeoData(blog.title.trim(), blog.content, language),
    onSuccess: (data) => {
      setBlog((current) => ({ ...current, seo: {
        ...current.seo,
        title: current.seo.title || current.title,
        description: data.descript,
        keywords: [...new Set(data.listSeoKey)],
      } }));
      setDirty(true);
      setConfirmSeo(false);
      toast.success("Đã tạo SEO bằng AI — chưa được lưu.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Confirm before replacing existing SEO descriptions or keywords.
  const handleGenerateSeo = () => {
    if (blog.seo.description.trim() || blog.seo.keywords.length) setConfirmSeo(true);
    else generateSeo.mutate();
  };

  // Save pending content or approve and publish directly through the website creation API.
  const save = useMutation({
    mutationFn: (action: "SAVE_PENDING" | "PUBLISH_NOW") => createBlogPost({
      tag: blog.tag, title: blog.title, banner_url: blog.banner_url, category: blog.category,
      content: blog.content,
      seo: { title: blog.seo.title, description: blog.seo.description, keywords: blog.seo.keywords, author: blog.seo.author },
    }, image, action),
    onSuccess: (created, action) => {
      toast.success(action === "PUBLISH_NOW" ? "Đã lưu và đăng bài viết lên website." : "Đã lưu bài viết chờ duyệt.");
      setDirty(false);
      setConfirmPublish(false);
      client.invalidateQueries({ queryKey: ["blogs"] });
      client.invalidateQueries({ queryKey: ["publication-blogs"] });
      client.invalidateQueries({ queryKey: ["categories"] });
      if (created?.id) navigate(action === "PUBLISH_NOW" ? `/blog/detail/${created.id}` : `/blog/default/${created.id}`);
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
          <span className="text-content-muted">Lưu chờ duyệt hoặc đăng ngay lên website.</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            title={save.isPending ? "Đang lưu" : "Lưu chờ duyệt"}
            aria-label={save.isPending ? "Đang lưu" : "Lưu chờ duyệt"}
            disabled={!formValid || bannerBusy || save.isPending || generateSeo.isPending || createCategoryMutation.isPending || draft.isPending}
            onClick={() => save.mutate("SAVE_PENDING")}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2.5 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
          >
            <FiSave className={`text-sm ${save.isPending ? "animate-pulse" : ""}`} />
            <span>{save.isPending ? "Đang lưu..." : "Lưu chờ duyệt"}</span>
          </button>
          <button
            type="button"
            disabled={!formValid || bannerBusy || save.isPending || generateSeo.isPending || createCategoryMutation.isPending || draft.isPending}
            onClick={() => setConfirmPublish(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-green px-4 py-2.5 text-xs font-semibold text-primary-black hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiSend className="text-sm" />
            <span>{save.isPending && save.variables === "PUBLISH_NOW" ? "Đang đăng..." : "Lưu và đăng"}</span>
          </button>
        </div>
      </BottomActionBar>

      <div className="flex w-fit gap-1 rounded-xl border border-surface-border bg-surface-card p-1">
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

          <CategoryCombobox
            value={blog.category}
            items={categories.data?.items ?? []}
            loading={categories.isPending}
            failed={categories.isError}
            creating={createCategoryMutation.isPending}
            onChange={(name) => updateBlog("category", name)}
            onCreate={(name) => createCategoryMutation.mutate(name)}
            onRetry={() => { void categories.refetch(); }}
          />

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

          <p className="md:col-span-2 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs text-content-muted">Đường dẫn sẽ được tạo tự động khi lưu bài.</p>
        </div>

      </div>

      {/* Section 2: Ảnh bìa bài viết (moved right after Thông tin cơ bản) */}
      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-3">
        <SectionHeading title="Ảnh bìa bài viết" description="Tải lên tệp ảnh (JPEG, PNG, WebP) - Tùy chọn" />
        <BlogBannerPicker file={image} objectKey={blog.banner_url} context={`${blog.title}\n${blog.content}`}
          disabled={save.isPending || bannerBusy} onBusyChange={setBannerBusy}
          onFileChange={(file) => { setImage(file); updateBlog("banner_url", ""); }}
          onUse={(objectKey) => { setImage(null); updateBlog("banner_url", objectKey); }} />
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
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Section 4: Cấu hình SEO */}
      <BlogSeoCollapse
        seo={blog.seo}
        onUpdateSeo={updateSeo}
        onGenerateSeo={handleGenerateSeo}
        generating={generateSeo.isPending}
        canGenerate={Boolean(blog.title.trim() && blog.content.trim()) && !save.isPending && !draft.isPending}
      />

      <ConfirmDialog
        isOpen={confirmSeo}
        title="Tạo lại SEO bằng AI?"
        message="Mô tả và từ khóa SEO hiện tại sẽ được thay thế. Nội dung bài viết, tiêu đề SEO, URL và tác giả được giữ nguyên."
        confirmLabel="Tạo SEO"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={generateSeo.isPending}
        onConfirm={() => generateSeo.mutate()}
        onCancel={() => setConfirmSeo(false)}
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
        title="Lưu và đăng bài lên website?"
        message="Bài viết sẽ được lưu, duyệt và hiển thị công khai trên website ngay. Thao tác này không đăng lên LinkedIn."
        confirmLabel="Lưu và đăng"
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
