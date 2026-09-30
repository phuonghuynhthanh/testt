import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { deleteBlog, getListBlogs, restoreBlog } from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { apiErrorMessage } from "../../../types/Api";
import type { BlogState } from "../../../types/Blog";
import { formatCmsDate } from "../../../utils/date";
import {
  StatusBadge,
  PageHeader,
  EmptyState,
  ConfirmDialog,
  Pagination,
} from "../../../shared/ui";

const STATE_FILTERS: Array<{ value: BlogState | undefined; label: string }> = [
  { value: undefined, label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

// Manage the paginated list of blog articles, category filters, and soft-deletion workflows.
const BlogManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [state, setState] = useState<BlogState | undefined>();
  const [category, setCategory] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const blogs = useQuery({
    queryKey: ["blogs", { page, pageSize: 20, state, category }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize: 20,
        ...(state ? { state } : {}),
        ...(category ? { category } : {}),
      }),
  });

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  const restore = useMutation({
    mutationFn: restoreBlog,
    onSuccess: () => {
      toast.success("Đã khôi phục bài viết.");
      client.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: deleteBlog,
    onSuccess: async (_, id) => {
      toast.success(
        <span>
          Đã chuyển bài viết vào thùng rác.{" "}
          <button
            type="button"
            className="underline font-semibold ml-1 text-primary-green hover:opacity-80"
            onClick={() => restore.mutate(id)}
          >
            Hoàn tác
          </button>
        </span>
      );
      setDeleteTargetId(null);
      await client.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Switch the active state filter and reset the pagination index to the first page.
  const handleSelectState = (next?: BlogState) => {
    setState(next);
    setPage(1);
  };

  // Switch the selected category filter and reset pagination.
  const handleSelectCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1);
  };

  // Execute confirmed soft deletion of the target blog post.
  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      remove.mutate(deleteTargetId);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Quản lý bài viết"
        description="Xem, phân loại và quản trị danh sách các bài viết trên hệ thống"
        actions={
          <Link
            to="/blog/create-blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-green hover:bg-primary-green-dark text-primary-black font-semibold text-sm transition-colors shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tạo bài viết</span>
          </Link>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card p-4 rounded-xl border border-surface-border">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATE_FILTERS.map((item) => {
            const isActive = state === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSelectState(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-surface-elevated text-primary-green border border-primary-green/30"
                    : "text-content-secondary hover:text-content-primary hover:bg-surface-elevated/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="cat-filter" className="text-xs text-content-muted">
            Danh mục:
          </label>
          <select
            id="cat-filter"
            value={category}
            onChange={handleSelectCategory}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
          >
            <option value="">Tất cả danh mục</option>
            {categories.data?.items.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden shadow-sm">
        {blogs.isLoading ? (
          <div className="py-20 text-center text-sm text-content-muted">
            Đang tải dữ liệu bài viết...
          </div>
        ) : blogs.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(blogs.error)}
          </div>
        ) : (blogs.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Không tìm thấy bài viết"
            description="Chưa có bài viết nào phù hợp với bộ lọc hiện tại. Thử chọn bộ lọc khác hoặc tạo bài viết mới."
            action={
              <Link
                to="/blog/create-blog"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary-green text-primary-black hover:bg-primary-green-dark transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                <span>Tạo bài viết đầu tiên</span>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-content-muted border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Tiêu đề bài viết</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {blogs.data?.items.map((blog) => (
                    <tr
                      key={blog.id}
                      className="hover:bg-surface-hover/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary max-w-xs truncate">
                        {blog.title}
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary">
                        <span className="px-2 py-0.5 rounded text-xs bg-surface-elevated border border-surface-border">
                          {blog.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={blog.state} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-content-muted whitespace-nowrap">
                        {formatCmsDate(blog.modified_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/blog/default/${blog.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-800/40 transition-colors"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(blog.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-800/40 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
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

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xác nhận xóa bài viết"
        message="Bài viết sẽ được chuyển khỏi danh sách hoạt động và đưa vào thùng rác. Bạn vẫn có thể khôi phục lại sau đó."
        confirmLabel="Xóa bài viết"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
};

export default BlogManagement;
