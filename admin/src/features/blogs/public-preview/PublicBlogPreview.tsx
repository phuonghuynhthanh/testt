import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "@phosphor-icons/react";
import { getListBlogs } from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { apiErrorMessage } from "../../../types/Api";
import { PageHeader, EmptyState, BlogThumbnail, Pagination } from "../../../shared/ui";
import PublicArticleReaderModal from "./PublicArticleReaderModal";

// Render public blog feed simulation as seen by unauthenticated guest visitors.
const PublicBlogPreview: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [readingSlug, setReadingSlug] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // Approved articles are what visitors see; page numbers come from the admin list totals.
  const blogsQuery = useQuery({
    queryKey: ["public-preview", { category: selectedCategory, page }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize: PAGE_SIZE,
        state: "APPROVED",
        ...(selectedCategory === "ALL" ? {} : { category: selectedCategory }),
      }),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  const items = blogsQuery.data?.items ?? [];
  const totalPages = Math.max(1, blogsQuery.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section>
      <PageHeader
        title="Xem như công khai"
        description="Dữ liệu đúng như khách truy cập thấy: chỉ các bài đã duyệt, không cần đăng nhập."
        actions={
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Danh mục"
            className="inp sm !w-auto"
          >
            <option value="ALL">Tất cả danh mục</option>
            {categoriesQuery.data?.items.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        }
      />

      {blogsQuery.isLoading ? (
        <div className="py-24 text-center text-sm text-content-muted">
          Đang nạp bài viết công khai...
        </div>
      ) : blogsQuery.isError ? (
        <div className="py-12 text-center text-sm text-rose-400">
          {apiErrorMessage(blogsQuery.error)}
        </div>
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Chưa có bài viết công khai nào"
            description="Các bài viết sau khi được duyệt sẽ hiển thị trên giao diện này cho khách truy cập."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((blog, index) => (
              <button
                key={blog.id}
                type="button"
                onClick={() => setReadingSlug(blog.link_post || blog.id)}
                aria-label={`Đọc bài ${blog.title}`}
                style={{ "--i": index } as React.CSSProperties}
                className="row-in group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card text-left transition-all duration-500 hover:-translate-y-0.5 hover:border-primary-green/40 hover:shadow-xl hover:shadow-black/30"
              >
                <div className="p-3 pb-0">
                  <BlogThumbnail
                    bannerUrl={blog.banner_url}
                    title={blog.title}
                    size="lg"
                    className="!aspect-auto !h-44 !rounded-xl"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <div className="space-y-2">
                    <span className="inline-block rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                      {blog.category || "Bài viết"}
                    </span>

                    <h3
                      className="line-clamp-2 text-base font-bold transition-colors group-hover:text-primary-green"
                      title={blog.title}
                    >
                      {blog.title}
                    </h3>

                    <p className="line-clamp-2 text-xs leading-relaxed text-content-muted">
                      {`Bài viết về ${blog.title.toLowerCase()} từ đội ngũ VietQuant.`}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-green">
                    Đọc bài
                    <ArrowRight size={16} weight="light" className="transition-transform duration-500 group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="panel mt-6">
            <Pagination
              page={blogsQuery.data?.page ?? page}
              totalPages={totalPages}
              totalItems={blogsQuery.data?.total}
              itemUnit="bài viết"
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <PublicArticleReaderModal
        slug={readingSlug}
        onClose={() => setReadingSlug(null)}
        onOpen={setReadingSlug}
      />
    </section>
  );
};

export default PublicBlogPreview;
