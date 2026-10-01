import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiSend, FiSearch } from "react-icons/fi";
import { getListBlogs } from "../../services/blog/handleBlog";
import { apiErrorMessage } from "../../types/Api";
import type { BlogState } from "../../types/Blog";
import {
  StatusBadge,
  PageHeader,
  EmptyState,
  Pagination,
  BlogThumbnail,
} from "../../shared/ui";

const PUBLICATION_STATE_TABS: Array<{ value: BlogState | undefined; label: string }> = [
  { value: undefined, label: "Tất cả" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PENDING", label: "Chờ duyệt" },
];

// Manage publication overview list and direct navigation to channel distribution setup.
const PublicationManagement: React.FC = () => {
  const [page, setPage] = useState(1);
  const [state, setState] = useState<BlogState | undefined>();
  const [searchTerm, setSearchTerm] = useState("");

  const blogs = useQuery({
    queryKey: ["publication-blogs", { page, pageSize: 20, state }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize: 20,
        ...(state ? { state } : {}),
      }),
  });

  const filteredItems = useMemo(() => {
    const items = blogs.data?.items ?? [];
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.trim().toLowerCase();
    return items.filter(
      (b) =>
        b.title.toLowerCase().includes(lower) ||
        (b.category && b.category.toLowerCase().includes(lower))
    );
  }, [blogs.data?.items, searchTerm]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Xuất bản"
        description="Chọn một bài viết để cấu hình kênh, soạn nội dung LinkedIn và đăng."
      />

      <div className="flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-950/20 p-3.5 text-xs text-teal-300">
        <FiSend className="w-4 h-4 shrink-0 text-primary-green" />
        <span>
          <strong>Quy trình:</strong> chọn kênh → soạn nội dung LinkedIn → kiểm tra ảnh → bấm Xuất bản. Chỉ bước cuối mới đăng thật.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card p-3 rounded-xl border border-surface-border">
        <div className="inline-flex rounded-lg bg-surface-elevated p-1 border border-surface-border">
          {PUBLICATION_STATE_TABS.map((tab) => {
            const isActive = state === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setState(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-surface-card text-content-primary shadow-xs border border-surface-border"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo bài viết hoặc danh mục..."
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
            description="Chưa có bài viết nào phù hợp để cấu hình xuất bản."
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
                          title="Mở cấu hình xuất bản"
                          aria-label="Mở cấu hình xuất bản"
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary-green/30 bg-primary-green/10 px-3 text-xs font-semibold text-primary-green hover:bg-primary-green/15 transition-colors shadow-xs"
                        >
                          <FiSend className="w-3.5 h-3.5 text-primary-green" />
                          <span>Mở luồng xuất bản</span>
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
