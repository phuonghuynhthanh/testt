import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretDown, CaretUp, CaretUpDown, Funnel, Files, Plus } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useDebouncedValue } from "../../../hook/useDebouncedValue";
import {
  bulkDeleteBlogs,
  bulkRestoreBlogs,
  bulkUpdateBlogState,
  exportBlogsCsv,
  getBlogCounts,
  getBlogStats,
  getListBlogs,
  type BlogSortKey,
} from "../../../services/blog/handleBlog";
import { listCategories } from "../../../services/category/handleCategory";
import { apiErrorMessage } from "../../../types/Api";
import type { BlogState, IBlogItemData } from "../../../types/Blog";
import { PageHeader, EmptyState, ConfirmDialog, Pagination } from "../../../shared/ui";
import BlogTableToolbar, { type Density } from "./components/BlogTableToolbar";
import BlogTableRow from "./components/BlogTableRow";
import BlogKpiStrip from "./components/BlogKpiStrip";
import BlogDetailDrawer from "./components/BlogDetailDrawer";

const STATE_LABELS: Record<BlogState, string> = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" };
const DENSITY_KEY = "vq-density";

// Read the saved row density, falling back to compact when storage is unavailable.
const readDensity = (): Density => {
  try {
    return localStorage.getItem(DENSITY_KEY) === "cozy" ? "cozy" : "compact";
  } catch {
    return "compact";
  }
};

// Render one sortable column header with its aria-sort state.
const SortHeader: React.FC<{
  label: string;
  sortKey: BlogSortKey;
  sort: BlogSortKey;
  dir: "asc" | "desc";
  onSort: (key: BlogSortKey) => void;
  className?: string;
}> = ({ label, sortKey, sort, dir, onSort, className }) => {
  const active = sort === sortKey;
  const Icon = active ? (dir === "asc" ? CaretUp : CaretDown) : CaretUpDown;
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className="sort" onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={12} weight="bold" />
      </button>
    </th>
  );
};

// Manage the blog list: KPIs, filters, sorting, bulk actions, export, quick-view drawer and shortcuts.
const BlogManagement: React.FC = () => {
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<BlogState | undefined>();
  const [category, setCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<BlogSortKey>("modified");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [density, setDensity] = useState<Density>(readDensity);

  const search = useDebouncedValue(searchTerm.trim());

  const blogs = useQuery({
    queryKey: ["blogs", "list", { page, pageSize, state, category, search, sort, dir }],
    queryFn: () =>
      getListBlogs({
        page,
        pageSize,
        sort,
        dir,
        ...(state ? { state } : {}),
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const counts = useQuery({
    queryKey: ["blogs", "counts", { category, search }],
    queryFn: () => getBlogCounts({ ...(category ? { category } : {}), ...(search ? { search } : {}) }),
    placeholderData: keepPreviousData,
  });

  const stats = useQuery({ queryKey: ["blogs", "stats"], queryFn: getBlogStats, staleTime: 30_000 });

  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  const items = useMemo(() => blogs.data?.items ?? [], [blogs.data?.items]);
  const totalPages = Math.max(1, blogs.data?.totalPages ?? 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Keep the density attribute on the body so the CSS can switch row heights.
  useEffect(() => {
    document.body.dataset.density = density;
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // Storage may be blocked; the density still applies for this visit.
    }
    return () => {
      delete document.body.dataset.density;
    };
  }, [density]);

  // Drop selections that are no longer on the visible page.
  useEffect(() => {
    setSelected((current) => {
      const ids = new Set(items.map((item) => item.id));
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const refresh = useCallback(() => client.invalidateQueries({ queryKey: ["blogs"] }), [client]);

  const stateMutation = useMutation({
    mutationFn: (changes: Array<{ id: string; state: BlogState }>) =>
      bulkUpdateBlogState(changes.map((change) => ({ id: change.id, state: change.state }))),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Change states and offer an undo that restores both state and timestamp.
  const changeState = async (ids: string[], next: BlogState) => {
    const previous = ids
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is IBlogItemData => Boolean(item) && item!.state !== next);
    if (!previous.length) return;
    try {
      await stateMutation.mutateAsync(previous.map((item) => ({ id: item.id, state: next })));
    } catch {
      return;
    }
    toast.success(
      <span>
        {STATE_LABELS[next]}: {previous.length} bài viết{" "}
        <button
          type="button"
          className="ml-1 font-semibold text-primary-green-dark underline"
          onClick={async () => {
            try {
              await bulkUpdateBlogState(
                previous.map((item) => ({ id: item.id, state: item.state, modifiedAt: item.modified_at })),
              );
              refresh();
            } catch (error) {
              toast.error(apiErrorMessage(error));
            }
          }}
        >
          Hoàn tác
        </button>
      </span>,
    );
    refresh();
  };

  const removeMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteBlogs(ids),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Soft-delete blogs and offer an undo that restores them with the original timestamps.
  const removeBlogs = async (ids: string[]) => {
    try {
      await removeMutation.mutateAsync(ids);
    } catch {
      return;
    }
    setDeleteIds([]);
    setSelected(new Set());
    setDrawerId(null);
    toast.success(
      <span>
        Đã xóa {ids.length} bài viết{" "}
        <button
          type="button"
          className="ml-1 font-semibold text-primary-green-dark underline"
          onClick={async () => {
            try {
              await bulkRestoreBlogs(ids);
              refresh();
            } catch (error) {
              toast.error(apiErrorMessage(error));
            }
          }}
        >
          Hoàn tác
        </button>
      </span>,
    );
    refresh();
  };

  const exportMutation = useMutation({
    mutationFn: () =>
      exportBlogsCsv({
        sort,
        dir,
        ...(state ? { state } : {}),
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
      }),
    onSuccess: ({ blob, truncated }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blogs.csv";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (truncated) toast.warn("Danh sách vượt 5.000 dòng nên tệp CSV đã bị cắt bớt.");
      else toast.success("Đã xuất danh sách ra CSV.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Reset to the first page whenever a filter changes.
  const resetPaging = () => {
    setPage(1);
    setActiveIndex(-1);
  };

  const handleSelectState = (next?: BlogState) => {
    setState(next);
    resetPaging();
  };

  // Toggle the sort direction on the same column, otherwise switch columns.
  const handleSort = (key: BlogSortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "modified" ? "desc" : "asc");
    }
    resetPaging();
  };

  const toggleSelect = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPage = items.length > 0 && items.every((item) => selected.has(item.id));
  const someOnPage = items.some((item) => selected.has(item.id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);

  const drawerIndex = drawerId ? items.findIndex((item) => item.id === drawerId) : -1;

  // Move the drawer to the previous or next blog in the current list.
  const stepDrawer = useCallback(
    (delta: number) => {
      const target = items[drawerIndex + delta];
      if (target) setDrawerId(target.id);
    },
    [items, drawerIndex],
  );

  // Keyboard shortcuts: / search, j/k move, x select, Enter open; j/k step inside the drawer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : document.body;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector("[role='dialog']")) return;
      if (drawerId) {
        if (event.key === "j" || event.key === "ArrowDown") stepDrawer(1);
        else if (event.key === "k" || event.key === "ArrowUp") stepDrawer(-1);
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if ((event.key === "j" || event.key === "k") && items.length) {
        setActiveIndex((current) => Math.max(0, Math.min(items.length - 1, current + (event.key === "j" ? 1 : -1))));
      } else if (event.key === "x" && items[activeIndex]) {
        toggleSelect(items[activeIndex].id);
      } else if (event.key === "Enter" && items[activeIndex] && !target.closest("button, a")) {
        setDrawerId(items[activeIndex].id);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [items, activeIndex, drawerId, stepDrawer]);

  // Keep the keyboard-focused row visible.
  useEffect(() => {
    if (activeIndex >= 0) document.querySelector(`tbody tr[data-i="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const filtered = Boolean(state || category || search);
  const clearFilters = () => {
    setState(undefined);
    setCategory("");
    setSearchTerm("");
    resetPaging();
  };

  const pendingTotal = stats.data?.PENDING.count;
  const deleteOne = deleteIds.length === 1 ? items.find((item) => item.id === deleteIds[0]) : undefined;

  return (
    <section>
      <PageHeader
        title="Quản lý bài viết"
        description={
          stats.data ? (
            <>
              <span className="mono">{stats.data.ALL.count}</span> bài viết ·{" "}
              <span className="mono">{pendingTotal ?? 0}</span> đang chờ duyệt
            </>
          ) : (
            "Xem, phân loại và quản trị danh sách các bài viết trên hệ thống"
          )
        }
        actions={
          <Link to="/blog/create-blog" title="Tạo bài viết" aria-label="Tạo bài viết" className="btn btn-primary btn-lg">
            <Plus size={16} weight="bold" />
            <span>Tạo bài viết</span>
          </Link>
        }
      />

      <BlogKpiStrip stats={stats.data} state={state} onSelect={handleSelectState} />

      <section className="panel" aria-label="Danh sách bài viết">
        <BlogTableToolbar
          state={state}
          onSelectState={handleSelectState}
          counts={counts.data}
          category={category}
          onSelectCategory={(e) => {
            setCategory(e.target.value);
            resetPaging();
          }}
          categories={categories.data?.items ?? []}
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            resetPaging();
          }}
          searchRef={searchRef}
          sortValue={`${sort}:${dir}`}
          onSortChange={(key, direction) => {
            setSort(key);
            setDir(direction);
            resetPaging();
          }}
          density={density}
          onDensityChange={setDensity}
          onExport={() => exportMutation.mutate()}
          isExporting={exportMutation.isPending}
          selectedCount={selected.size}
          onBulkApprove={() => void changeState([...selected], "APPROVED")}
          onBulkReject={() => void changeState([...selected], "REJECTED")}
          onBulkDelete={() => setDeleteIds([...selected])}
          onClearSelection={() => setSelected(new Set())}
        />

        {blogs.isLoading ? (
          <table className="tbl" aria-busy="true">
            <caption className="sr-only">Đang tải danh sách</caption>
            <tbody>
              {Array.from({ length: 6 }, (_, index) => (
                <tr key={index}>
                  <td className="c-chk" />
                  <td className="c-ttl"><span className="skel" style={{ width: `${50 + ((index * 17) % 40)}%` }} /></td>
                  <td className="c-cat"><span className="skel" style={{ width: "70%" }} /></td>
                  <td className="c-state"><span className="skel" style={{ width: "60%" }} /></td>
                  <td className="c-date"><span className="skel" style={{ width: "70%" }} /></td>
                  <td className="c-act" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : blogs.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">{apiErrorMessage(blogs.error)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={filtered ? <Funnel size={22} weight="light" /> : <Files size={22} weight="light" />}
            title={filtered ? "Không có bài viết phù hợp" : "Chưa có bài viết"}
            description={
              filtered
                ? "Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm."
                : "Tạo bài viết đầu tiên để bắt đầu."
            }
            action={
              filtered ? (
                <button type="button" className="btn btn-ghost" onClick={clearFilters}>Xóa bộ lọc</button>
              ) : (
                <Link to="/blog/create-blog" className="btn btn-primary"><Plus size={16} weight="bold" />Tạo bài viết</Link>
              )
            }
          />
        ) : (
          <>
            <div className="max-[719px]:overflow-x-auto">
              <table className="tbl">
                <caption className="sr-only">Danh sách bài viết, {blogs.data?.total ?? items.length} kết quả</caption>
                <colgroup>
                  <col className="w-chk" />
                  <col />
                  <col className="w-cat" />
                  <col className="w-state" />
                  <col className="w-date" />
                  <col className="w-act" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">
                      <label className="chk">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allOnPage}
                          onChange={() =>
                            setSelected(allOnPage ? new Set() : new Set(items.map((item) => item.id)))
                          }
                          aria-label="Chọn tất cả bài trên trang này"
                        />
                      </label>
                    </th>
                    <SortHeader label="Tiêu đề" sortKey="title" sort={sort} dir={dir} onSort={handleSort} />
                    <SortHeader label="Danh mục" sortKey="category" sort={sort} dir={dir} onSort={handleSort} className="c-cat" />
                    <SortHeader label="Trạng thái" sortKey="state" sort={sort} dir={dir} onSort={handleSort} />
                    <SortHeader label="Cập nhật" sortKey="modified" sort={sort} dir={dir} onSort={handleSort} />
                    <th scope="col" className="!text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((blog, index) => (
                    <BlogTableRow
                      key={blog.id}
                      blog={blog}
                      index={index}
                      selected={selected.has(blog.id)}
                      keyboardActive={index === activeIndex}
                      onToggleSelect={toggleSelect}
                      onOpen={setDrawerId}
                      onApprove={(id) => void changeState([id], "APPROVED")}
                      onDelete={(id) => setDeleteIds([id])}
                      isApproving={stateMutation.isPending}
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
                resetPaging();
              }}
              onPageChange={(p) => {
                setPage(p);
                setActiveIndex(-1);
              }}
            />
          </>
        )}
      </section>

      <p className="keys" aria-hidden="true">
        <span><kbd>/</kbd>Tìm kiếm</span>
        <span><kbd>j</kbd><kbd>k</kbd>Di chuyển hàng</span>
        <span><kbd>Enter</kbd>Mở nhanh</span>
        <span><kbd>x</kbd>Chọn hàng</span>
        <span><kbd>Esc</kbd>Đóng</span>
      </p>

      <BlogDetailDrawer
        blogId={drawerId}
        position={drawerIndex}
        total={items.length}
        onClose={() => setDrawerId(null)}
        onStep={stepDrawer}
        onSetState={(id, next) => void changeState([id], next)}
        onDelete={(id) => {
          setDrawerId(null);
          window.setTimeout(() => setDeleteIds([id]), 170);
        }}
      />

      <ConfirmDialog
        isOpen={deleteIds.length > 0}
        title={deleteOne ? "Xác nhận xóa bài viết" : `Xóa ${deleteIds.length} bài viết?`}
        message={
          deleteOne
            ? `Bạn có chắc chắn muốn xóa bài viết "${deleteOne.title}"? Bạn có thể hoàn tác ngay sau đó.`
            : "Các bài viết sẽ được chuyển vào thùng rác. Bạn có thể hoàn tác ngay sau đó."
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={removeMutation.isPending}
        onConfirm={() => void removeBlogs(deleteIds)}
        onCancel={() => setDeleteIds([])}
      />
    </section>
  );
};

export default BlogManagement;
