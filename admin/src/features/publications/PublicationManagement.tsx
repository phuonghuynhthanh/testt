import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../../hook/useDebouncedValue";
import { PaperPlaneTilt, MagnifyingGlass, Path } from "@phosphor-icons/react";
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
        include: "linkedin",
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = Math.max(1, blogs.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filteredItems = blogs.data?.items ?? [];

  return (
    <section>
      <PageHeader
        title="Xuất bản bài viết"
        description="Chọn bài website đã duyệt để tạo và đăng bài LinkedIn."
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-950/20 p-4 text-xs leading-relaxed text-teal-300">
        <Path weight="light" size={18} className="mt-0.5 shrink-0 text-primary-green" />
        <span>
          <strong>Quy trình:</strong> chọn bài website, soạn nội dung LinkedIn, chọn ảnh và liên kết, rồi đăng LinkedIn. Chỉ bước cuối mới đăng thật.
        </span>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-surface-border p-3.5">
          <div className="relative sm:w-80">
            <MagnifyingGlass
              weight="light"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tiêu đề hoặc đường dẫn..."
              className="inp sm !pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        {blogs.isLoading ? (
          <div className="py-16 text-center text-sm text-content-muted">
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
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_11rem] gap-4 border-b border-surface-border bg-surface-elevated/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-content-muted md:grid">
              <span>Bài viết</span>
              <span>LinkedIn</span>
              <span className="text-right">Thao tác</span>
            </div>
            <ul className="divide-y divide-surface-border">
              {filteredItems.map((blog) => (
                <li
                  key={blog.id}
                  className="hrow row-in grid items-center gap-x-4 gap-y-3 px-3 py-2.5 transition-colors duration-300 hover:bg-surface-hover/50 md:grid-cols-[minmax(0,1fr)_9rem_11rem]"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <BlogThumbnail bannerUrl={blog.banner_url} title={blog.title} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" title={blog.title}>
                        {blog.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-content-muted">
                        {blog.category || "Chưa phân loại"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {blog.linkedinPost ? (
                      <StatusBadge status={blog.linkedinPost.status} />
                    ) : (
                      <span className="text-xs text-content-muted">Chưa có bài LinkedIn</span>
                    )}
                  </div>
                  <div className="md:text-right">
                    <Link
                      to={`/publications/${blog.id}`}
                      title="Tạo bài LinkedIn"
                      className="btn btn-li"
                    >
                      <PaperPlaneTilt weight="light" size={14} />
                      <span>{blog.linkedinPost ? "Mở bài LinkedIn" : "Tạo bài LinkedIn"}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={blogs.data?.page ?? page}
              totalPages={blogs.data?.totalPages ?? 1}
              totalItems={blogs.data?.total}
              itemUnit="bài viết"
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </section>
    </section>
  );
};

export default PublicationManagement;
