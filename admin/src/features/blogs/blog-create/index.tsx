import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import MarkdownEditor from "../../../shared/markdown/MarkdownEditor";
import Modal from "../../../shared/Popup/Modal";
import { createUrl } from "../../../utils/blogUtils";
import { apiErrorMessage } from "../../../types/Api";
import type { IBlogData, SEO } from "../../../types/Blog";
import { createBlogPost, generateBlogDraft } from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";

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

// Keep one editable Blog editor for manual writing and preview-only AI drafts.
const BlogCreate = () => {
  const client = useQueryClient();
  const [source, setSource] = useState<"manual" | "ai">("manual");
  const [blog, setBlog] = useState<IBlogData>(EMPTY_BLOG);
  const [image, setImage] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  // Update one top-level Blog field from a visible editor control.
  const updateBlog = <K extends keyof IBlogData>(field: K, value: IBlogData[K]) => {
    setBlog((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  // Update one SEO field without keeping a hidden copy of AI output.
  const updateSeo = <K extends keyof SEO>(field: K, value: SEO[K]) => {
    setBlog((current) => ({ ...current, seo: { ...current.seo, [field]: value } }));
    setDirty(true);
  };

  // Keep an untouched slug synchronized with the title while allowing manual edits.
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
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const save = useMutation({
    mutationFn: (action: "SAVE_PENDING" | "PUBLISH_NOW") => createBlogPost({
      ...blog,
      link_post: blog.link_post.trim() || createUrl(blog.title),
    }, image, action),
    onSuccess: (_, action) => {
      toast.success(action === "PUBLISH_NOW" ? "Đã xuất bản website." : "Đã lưu chờ duyệt.");
      setDirty(false);
      setConfirmPublish(false);
      client.invalidateQueries({ queryKey: ["blogs"] });
      client.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Warn only when the administrator has actual local work to lose.
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);

  // Replace an existing draft only after explicit confirmation.
  const regenerate = () => {
    if (blog.content.trim() && !window.confirm("Bản nháp hiện tại sẽ bị thay thế. Tiếp tục?")) return;
    draft.mutate();
  };

  const formValid = Boolean(blog.title.trim() && blog.category.trim() && blog.content.trim());

  return (
    <section className="mx-auto max-w-4xl space-y-5 text-gray-th2">
      <div>
        <h1 className="text-2xl font-bold text-primary-white">Viết bài</h1>
        <label className="mr-5"><input type="radio" checked={source === "manual"} onChange={() => setSource("manual")} /> Viết thủ công</label>
        <label><input type="radio" checked={source === "ai"} onChange={() => setSource("ai")} /> Tạo bản nháp bằng AI</label>
      </div>

      <label className="block">Tiêu đề
        <input value={blog.title} onChange={(event) => updateTitle(event.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" />
      </label>
      <label className="block">Danh mục
        <input list="blog-create-categories" value={blog.category} onChange={(event) => updateBlog("category", event.target.value)} placeholder="Chọn hoặc nhập danh mục mới" className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" />
        <datalist id="blog-create-categories">{categories.data?.items.map((item) => <option key={item.id} value={item.name} />)}</datalist>
      </label>
      {source === "ai" && (
        <button disabled={!blog.title.trim() || !blog.category.trim() || draft.isPending} onClick={regenerate} className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
          {draft.isPending ? "Đang tạo bằng AI…" : blog.content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
        </button>
      )}

      <label className="block">Tag
        <input value={blog.tag} onChange={(event) => updateBlog("tag", event.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" />
      </label>
      <label className="block">Đường dẫn bài viết
        <input value={blog.link_post} onChange={(event) => updateBlog("link_post", event.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" />
      </label>
      <MarkdownEditor value={blog.content} title={blog.title} onChange={(value) => updateBlog("content", value)} height="h-96" placeholder="Nội dung Markdown…" />

      <fieldset className="space-y-4 rounded border border-gray-700 p-4">
        <legend className="px-2 font-semibold text-primary-white">SEO</legend>
        <label className="block">Tiêu đề SEO
          <input value={blog.seo.title} onChange={(event) => updateSeo("title", event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
        <label className="block">Mô tả SEO
          <textarea value={blog.seo.description} onChange={(event) => updateSeo("description", event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
        <label className="block">URL SEO
          <input value={blog.seo.url} onChange={(event) => updateSeo("url", event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
        <label className="block">Từ khóa SEO, ngăn bằng dấu phẩy
          <input value={blog.seo.keywords.join(", ")} onChange={(event) => updateSeo("keywords", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
        <label className="block">Tác giả
          <input value={blog.seo.author} onChange={(event) => updateSeo("author", event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
      </fieldset>

      <label className="block">Banner (không bắt buộc)
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { setImage(event.target.files?.[0] ?? null); setDirty(true); }} className="ml-3" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button disabled={!formValid || save.isPending} onClick={() => save.mutate("SAVE_PENDING")} className="rounded bg-gray-700 px-4 py-3 text-white disabled:opacity-50">{save.isPending ? "Đang lưu…" : "Lưu chờ duyệt"}</button>
        <button disabled={!formValid || save.isPending} onClick={() => setConfirmPublish(true)} className="rounded bg-primary-green px-4 py-3 font-semibold text-primary-black disabled:opacity-50">Xuất bản Website ngay</button>
      </div>

      <Modal isOpen={confirmPublish} onClose={() => setConfirmPublish(false)}>
        <h2 className="text-xl text-primary-white">Bạn sắp xuất bản bài viết này lên website.</h2>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setConfirmPublish(false)} className="rounded bg-gray-700 px-4 py-2 text-white">Hủy</button>
          <button disabled={save.isPending} onClick={() => save.mutate("PUBLISH_NOW")} className="rounded bg-primary-green px-4 py-2 text-primary-black">Xuất bản</button>
        </div>
      </Modal>
    </section>
  );
};

export default BlogCreate;
