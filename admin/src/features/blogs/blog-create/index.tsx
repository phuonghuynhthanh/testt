import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkle, FileText, FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { apiErrorMessage } from "../../../types/Api";
import type { IBlogData, SEO } from "../../../types/Blog";
import { createBlogPost, generateBlogDraft } from "../../../services/blog/handleBlog";
import { createCategory, listCategories } from "../../../services/category/handleCategory";
import { PageHeader, ConfirmDialog, BottomActionBar } from "../../../shared/ui";
import BlogSeoCollapse from "./BlogSeoCollapse";
import BlogContentEditorCard from "./BlogContentEditorCard";
import BlogBasicFieldsCard from "./BlogBasicFieldsCard";
import { getSeoData } from "../../../services/openai/handleSeoGenerate";
import type { PostLanguage } from "../../../types/Language";

const EMPTY_BLOG: IBlogData = {
  tag: "", title: "", banner_url: "", link_post: "", category: "", content: "",
  seo: { title: "", description: "", url: "", keywords: [], author: "VietQuant" },
};

// Coordinate new blog authoring with AI generation, live preview, and draft/publication saving.
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

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: async (category) => {
      updateBlog("category", category.name);
      await client.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Đã tạo danh mục “${category.name}”.`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateBlog = <K extends keyof IBlogData>(field: K, value: IBlogData[K]) => {
    setBlog((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const updateSeo = <K extends keyof SEO>(field: K, value: SEO[K]) => {
    setBlog((prev) => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
    setDirty(true);
  };

  const formValid = Boolean(blog.title.trim() && blog.category.trim() && blog.content.trim());

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const draft = useMutation({
    mutationFn: () => generateBlogDraft(blog.title.trim(), blog.category.trim(), language),
    onSuccess: (data) => {
      setBlog((prev) => ({
        ...prev,
        content: data.content,
        seo: {
          ...prev.seo,
          title: data.seo.title || prev.seo.title,
          description: data.seo.description || prev.seo.description,
          keywords: data.seo.keywords?.length ? data.seo.keywords : prev.seo.keywords,
        },
      }));
      setDirty(true);
      toast.success("Đã tạo bản nháp bài viết từ AI.");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const generateSeo = useMutation({
    mutationFn: () => getSeoData(blog.title.trim(), blog.content.trim(), language),
    onSuccess: (data) => {
      setBlog((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          description: data.descript || prev.seo.description,
          keywords: data.listSeoKey?.length ? [...new Set([...prev.seo.keywords, ...data.listSeoKey])] : prev.seo.keywords,
        },
      }));
      setDirty(true);
      toast.success("Đã tạo nội dung SEO thành công.");
    },
    onError: () => toast.error("Không thể tạo nội dung SEO. Vui lòng thử lại."),
  });

  const save = useMutation({
    mutationFn: async (mode: "SAVE_PENDING" | "PUBLISH_NOW") => {
      const saved = await createBlogPost(blog, image, mode);
      return { saved, mode };
    },
    onSuccess: async ({ saved, mode }) => {
      setDirty(false);
      await client.invalidateQueries({ queryKey: ["blogs"] });
      toast.success(mode === "PUBLISH_NOW" ? "Đã lưu và đăng bài viết thành công." : "Đã lưu bài viết ở trạng thái chờ duyệt.");
      navigate(`/blog/detail/${saved.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handleRegenerateClick = () => {
    if (blog.content.trim()) setConfirmRegenerate(true);
    else draft.mutate();
  };

  const handleGenerateSeo = () => {
    if (blog.seo.description.trim() || blog.seo.keywords.length > 0) setConfirmSeo(true);
    else generateSeo.mutate();
  };

  return (
    <section className="space-y-6 pb-40 sm:pb-28 max-w-[968px] mx-auto">
      <PageHeader
        title="Tạo bài viết mới"
        description="Soạn thảo bài viết mới hoặc tạo nhanh từ AI. Bài viết sau khi lưu sẽ ở trạng thái chờ duyệt."
      />

      <div className="seg self-start">
        <button
          type="button"
          onClick={() => setSource("ai")}
          aria-selected={source === "ai"}
          className={source === "ai" ? "!text-purple-300" : ""}
        >
          <Sparkle size={14} weight="light" className="text-purple-400" />
          <span>Trợ lý AI</span>
        </button>
        <button type="button" onClick={() => setSource("manual")} aria-selected={source === "manual"}>
          <FileText size={14} weight="light" />
          <span>Viết thủ công</span>
        </button>
      </div>

      <BottomActionBar>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">{formValid ? "Bài viết đã sẵn sàng" : "Đang soạn thảo bài viết"}</span>
          <span className="hidden text-content-muted sm:inline">
            {dirty ? "Có thay đổi chưa lưu." : "Lưu chờ duyệt hoặc đăng ngay lên website."}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!formValid || save.isPending || bannerBusy}
            onClick={() => save.mutate("SAVE_PENDING")}
            className="btn btn-secondary"
          >
            <FloppyDisk size={16} weight="light" />
            <span>{save.isPending ? "Đang lưu..." : "Lưu bản nháp"}</span>
          </button>
          <button
            type="button"
            disabled={!formValid || save.isPending || bannerBusy}
            onClick={() => setConfirmPublish(true)}
            className="btn btn-primary"
          >
            <PaperPlaneTilt size={16} weight="light" />
            <span>Lưu & Đăng bài</span>
          </button>
        </div>
      </BottomActionBar>

      <BlogBasicFieldsCard
        title={blog.title}
        onUpdateTitle={(val) => { updateBlog("title", val); updateBlog("link_post", val); }}
        category={blog.category}
        onUpdateCategory={(val) => updateBlog("category", val)}
        tag={blog.tag}
        onUpdateTag={(val) => updateBlog("tag", val)}
        image={image}
        bannerUrl={blog.banner_url}
        onFileChange={setImage}
        onUseBanner={(objectKey) => { setImage(null); updateBlog("banner_url", objectKey); }}
        bannerBusy={bannerBusy}
        onBusyChange={setBannerBusy}
        disabled={save.isPending}
        categories={categories.data?.items ?? []}
        categoriesLoading={categories.isPending}
        categoriesFailed={categories.isError}
        creatingCategory={createCategoryMutation.isPending}
        onCreateCategory={(name) => createCategoryMutation.mutate(name)}
        onRetryCategories={() => { void categories.refetch(); }}
        articleContent={blog.content}
      />

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
        message="Mô tả và từ khóa SEO hiện tại sẽ được thay thế."
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
        message="Nội dung bài viết hiện tại sẽ bị thay thế bằng bản nháp mới do AI sinh ra."
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
        message="Bài viết sẽ được lưu, duyệt và hiển thị công khai trên website ngay."
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
