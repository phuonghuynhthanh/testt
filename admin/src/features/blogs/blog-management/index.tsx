import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Files, Plus, XCircle } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useDebouncedValue } from "../../../hook/useDebouncedValue";
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


// KPI cards double as status filters; counts come from one-item list queries.
const KPI_DEFS: Array<{ state?: BlogState; label: string; Icon: typeof Files }> = [
  { state: undefined, label: "Tổng bài viết", Icon: Files },
  { state: "PENDING", label: "Chờ duyệt", Icon: Clock },
  { state: "APPROVED", label: "Đã duyệt", Icon: CheckCircle },
  { state: "REJECTED", label: "Từ chối", Icon: XCircle },
];

const BlogManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<BlogState | undefined>();
  const [category, setCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const search = useDebouncedValue(searchTerm.trim());

  const blogs = useQuery({
    queryKey: ["blogs", { page, pageSize, state, category, search }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize,
        ...(state ? { state } : {}),
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const kpiCounts = useQueries({
    queries: KPI_DEFS.map((def) => ({
      queryKey: ["blogs", "count", def.state ?? "ALL"],
      queryFn: () => getListBlogs({ page: 1, pageSize: 1, ...(def.state ? { state: def.state } : {}) }),
      staleTime: 30_000,
    })),
  });

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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý bài viết"
        description={
          kpiCounts[0].data ? (
            <>
              <span className="mono text-content-primary">{kpiCounts[0].data.total}</span> bài viết ·{" "}
              <span className="mono text-content-primary">{kpiCounts[1].data?.total ?? 0}</span> đang chờ duyệt
            </>
          ) : (
            "Xem, phân loại và quản trị danh sách các bài viết trên hệ thống"
          )
        }
        actions={
          <Link
            to="/blog/create-blog"
            title="Tạo bài viết"
            aria-label="Tạo bài viết"
            className="btn btn-primary btn-lg"
          >
            <Plus size={16} weight="bold" />
            <span>Tạo bài viết</span>
          </Link>
        }
      />

      <section className="kpis" aria-label="Tổng quan trạng thái">
        {KPI_DEFS.map(({ state: kpiState, label, Icon }, index) => (
          <button
            key={label}
            type="button"
            data-state={kpiState ?? ""}
            aria-pressed={state === kpiState}
            onClick={() => handleSelectState(state === kpiState ? undefined : kpiState)}
            className={`kpi${state === kpiState ? " on" : ""}`}
          >
            <span className="kpi-h">
              <span>{label}</span>
              <Icon size={16} weight="light" />
            </span>
            <span className="kpi-v mono">{kpiCounts[index].data?.total ?? "–"}</span>
          </button>
        ))}
      </section>

      <div className="panel">
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

        {blogs.isLoading ? (
          <div className="py-16 text-center text-sm text-content-muted">
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
                className="btn btn-primary"
              >
                <Plus size={16} weight="bold" />
                <span>Tạo bài viết</span>
              </Link>
            }
          />
        ) : (
          <>
            <div className="max-[719px]:overflow-x-auto">
              <table className="tbl">
                <colgroup>
                  <col />
                  <col className="w-cat" />
                  <col className="w-state" />
                  <col className="w-date" />
                  <col className="w-act" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Tiêu đề</th>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Cập nhật</th>
                    <th scope="col" className="!text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
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

            <Pagination
              page={blogs.data?.page ?? page}
              totalPages={blogs.data?.totalPages ?? 1}
              totalItems={blogs.data?.total}
              itemUnit="bài viết"
              variant="dense"
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onPageChange={(p) => setPage(p)}
            />
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
