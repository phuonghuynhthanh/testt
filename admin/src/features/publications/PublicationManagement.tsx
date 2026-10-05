import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../../hook/useDebouncedValue";
import { FiSend, FiSearch } from "react-icons/fi";
import { getListBlogs } from "../../services/blog/handleBlog";
import { apiErrorMessage } from "../../types/Api";
import {
  StatusBadge,
  PageHeader,
  EmptyState,
  Pagination,
  BlogThumbnail,
} from "../../shared/ui";


const PAGE_SIZE = 10;

// List approved website articles available for LinkedIn adaptation.
const PublicationManagement: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const search = useDebouncedValue(searchTerm.trim());

  const blogs = useQuery({
    queryKey: ["publication-blogs", { page, pageSize: PAGE_SIZE, state: "APPROVED", search }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize: PAGE_SIZE,
        state: "APPROVED",
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  // Step back when the current page disappears (e.g. its last item was deleted).
  const totalPages = Math.max(1, blogs.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filteredItems = blogs.data?.items ?? [];

  return (
    <section className="space-y-5">
      <PageHeader
        title="Xuất bản bài viết"
        description="Chọn bài website đã duyệt để tạo và đăng bài LinkedIn."
      />

      <div className="flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-950/20 p-3.5 text-xs text-teal-300">
        <FiSend className="w-4 h-4 shrink-0 text-primary-green" />
        <span>
          <strong>Quy trình:</strong> chọn bài website → soạn nội dung LinkedIn → chọn ảnh và liên kết → đăng LinkedIn. Chỉ bước cuối mới đăng thật.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card p-3 rounded-xl border border-surface-border">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề hoặc đường dẫn..."
            className="w-full rounded-lg border border-surface-border bg-surface-elevated pl-8 pr-3 py-1.5 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:ring-1 focus:ring-primary-green"
          />
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs pointer-events-none" />
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden shadow-sm">
        {blogs.isLoading ? (
          <div className="py-20 text-center text-sm text-content-muted">
            Đang tải danh sách bài viết xuất bản...
          </div>
        ) : blogs.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(blogs.error)}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bài viết"
            description="Duyệt bài trong Quản lý bài viết để bài xuất hiện tại đây và có thể tạo bài LinkedIn."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-content-muted border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Bài viết</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredItems.map((blog) => (
                    <tr
                      key={blog.id}
                      className="hover:bg-surface-hover/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <BlogThumbnail
                            bannerUrl={blog.banner_url}
                            title={blog.title}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <h4
                              className="text-xs sm:text-sm font-semibold text-content-primary truncate group-hover:text-primary-green transition-colors"
                              title={blog.title}
                            >
                              {blog.title}
                            </h4>
                            <p className="text-[11px] text-content-muted mt-0.5">
                              {blog.category || "Chưa phân loại"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={blog.state} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/publications/${blog.id}`}
                          title="Tạo bài LinkedIn"
                          aria-label="Tạo bài LinkedIn"
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary-green/30 bg-primary-green/10 px-3 text-xs font-semibold text-primary-green hover:bg-primary-green/15 transition-colors shadow-xs"
                        >
                          <FiSend className="w-3.5 h-3.5 text-primary-green" />
                          <span>Tạo bài LinkedIn</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-surface-border px-4 bg-surface-card">
              <Pagination
                page={blogs.data?.page ?? page}
                totalPages={blogs.data?.totalPages ?? 1}
                totalItems={blogs.data?.total}
                itemUnit="bài viết"
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PublicationManagement;
