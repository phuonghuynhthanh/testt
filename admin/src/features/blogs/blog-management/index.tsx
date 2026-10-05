import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "../../../hook/useDebouncedValue";
import { FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  deleteBlog,
  getListBlogs,
  restoreBlog,
  updateBlog,
} from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { apiErrorMessage } from "../../../types/Api";
import type { BlogState } from "../../../types/Blog";
import {
  PageHeader,
  EmptyState,
  ConfirmDialog,
  Pagination,
} from "../../../shared/ui";
import BlogTableToolbar from "./components/BlogTableToolbar";
import BlogTableRow from "./components/BlogTableRow";

const PAGE_SIZE = 10;

// Manage article list, status filtering, search queries, quick approval, and deletion.
const BlogManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [state, setState] = useState<BlogState | undefined>();
  const [category, setCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const search = useDebouncedValue(searchTerm.trim());

  const blogs = useQuery({
    queryKey: ["blogs", { page, pageSize: PAGE_SIZE, state, category, search }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize: PAGE_SIZE,
        ...(state ? { state } : {}),
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  // Step back when the current page disappears (e.g. its last item was deleted).
  const totalPages = Math.max(1, blogs.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  const approve = useMutation({
    mutationFn: (blogId: string) => updateBlog({ id: blogId, state: "APPROVED" }),
    onSuccess: () => {
      toast.success("Đã duyệt bài viết thành công.");
      client.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
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
    onSuccess: (_, id) => {
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
      client.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handleSelectState = (next?: BlogState) => {
    setState(next);
    setPage(1);
  };

  const handleSelectCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const filteredItems = blogs.data?.items ?? [];

  // Search is applied by the backend, so a new term restarts at the first page.
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title="Quản lý bài viết"
        description="Xem, phân loại và quản trị danh sách các bài viết trên hệ thống"
        actions={
          <Link
            to="/blog/create-blog"
            title="Tạo bài viết"
            aria-label="Tạo bài viết"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-green px-3.5 text-xs font-semibold text-primary-black shadow-sm transition-colors hover:bg-primary-green-dark"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tạo bài viết</span>
          </Link>
        }
      />

      <BlogTableToolbar
        state={state}
        onSelectState={handleSelectState}
        category={category}
        onSelectCategory={handleSelectCategory}
        categories={categories.data?.items ?? []}
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
        totalItems={blogs.data?.total ?? filteredItems.length}
      />

      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden shadow-sm">
        {blogs.isLoading ? (
          <div className="py-20 text-center text-sm text-content-muted">
            Đang tải dữ liệu bài viết...
          </div>
        ) : blogs.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(blogs.error)}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bài viết"
            description="Chưa có bài viết nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
            action={
              <Link
                to="/blog/create-blog"
                title="Tạo bài viết đầu tiên"
                aria-label="Tạo bài viết đầu tiên"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-green px-3.5 text-xs font-semibold text-primary-black transition-colors hover:bg-primary-green-dark"
              >
                <FiPlus className="w-4 h-4" />
                <span>Tạo bài viết</span>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead className="bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-content-muted border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Bài viết</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredItems.map((blog) => (
                    <BlogTableRow
                      key={blog.id}
                      blog={blog}
                      onApprove={(id) => approve.mutate(id)}
                      onDelete={(id) => setDeleteTargetId(id)}
                      isApproving={approve.isPending}
                    />
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
        onConfirm={() => deleteTargetId && remove.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
};

export default BlogManagement;
