import React, { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FiArrowRight } from "react-icons/fi";
import { getClientBlogs } from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { apiErrorMessage } from "../../../types/Api";
import { PageHeader, EmptyState, BlogThumbnail } from "../../../shared/ui";
import PublicArticleReaderModal from "./PublicArticleReaderModal";

// Render public blog feed simulation as seen by unauthenticated guest visitors.
const PublicBlogPreview: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [readingSlug, setReadingSlug] = useState<string | null>(null);

  // The backend pages by "blogs already loaded"; next_req is null on the last batch.
  const blogsQuery = useInfiniteQuery({
    queryKey: ["client-blogs", { category: selectedCategory }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getClientBlogs({
        num_of_blogs: pageParam,
        category: selectedCategory === "ALL" ? undefined : selectedCategory,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next_req ? allPages.reduce((sum, p) => sum + p.blogs.length, 0) : undefined,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  const items = useMemo(
    () => blogsQuery.data?.pages.flatMap((p) => p.blogs) ?? [],
    [blogsQuery.data?.pages],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Xem như công khai"
          description="Dữ liệu đúng như khách truy cập thấy: chỉ các bài đã duyệt, không cần đăng nhập."
        />

        <div className="shrink-0 self-start sm:self-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
          >
            <option value="ALL">Tất cả danh mục</option>
            {categoriesQuery.data?.items.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {blogsQuery.isLoading ? (
        <div className="py-24 text-center text-sm text-content-muted">
          Đang nạp bài viết công khai...
        </div>
      ) : blogsQuery.isError ? (
        <div className="py-12 text-center text-sm text-rose-400">
          {apiErrorMessage(blogsQuery.error)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có bài viết công khai nào"
          description="Các bài viết sau khi được duyệt sẽ hiển thị trên giao diện này cho khách truy cập."
        />
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((blog) => (
            <button
              key={blog.id}
              type="button"
              onClick={() => setReadingSlug(blog.link_post || blog.id)}
              aria-label={`Đọc bài ${blog.title}`}
              className="flex flex-col bg-surface-card rounded-2xl border border-surface-border overflow-hidden cursor-pointer group text-left hover:border-primary-green/40 hover:-translate-y-0.5 hover:shadow-lg focus-visible:border-primary-green transition-all duration-200"
            >
              <div className="p-3 pb-0">
                <BlogThumbnail
                  bannerUrl={blog.banner_url}
                  title={blog.title}
                  size="lg"
                  className="rounded-xl"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                    {blog.category || "Bài viết"}
                  </span>

                  <h3
                    className="text-sm sm:text-base font-bold text-content-primary line-clamp-2 group-hover:text-primary-green transition-colors"
                    title={blog.title}
                  >
                    {blog.title}
                  </h3>

                  <p className="text-xs text-content-muted line-clamp-2 leading-relaxed">
                    {blog.seo?.description ||
                      `Bài viết về ${blog.title.toLowerCase()} từ đội ngũ VietQuant.`}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-green">
                  Đọc bài
                  <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
        {blogsQuery.hasNextPage && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => blogsQuery.fetchNextPage()}
              disabled={blogsQuery.isFetchingNextPage}
              className="inline-flex h-9 items-center rounded-lg border border-surface-border bg-surface-card px-4 text-xs font-medium text-content-primary transition-colors hover:bg-surface-elevated disabled:opacity-50"
            >
              {blogsQuery.isFetchingNextPage ? "Đang tải..." : "Xem thêm bài viết"}
            </button>
          </div>
        )}
        </>
      )}

      <PublicArticleReaderModal
        slug={readingSlug}
        onClose={() => setReadingSlug(null)}
      />
    </section>
  );
};

export default PublicBlogPreview;
