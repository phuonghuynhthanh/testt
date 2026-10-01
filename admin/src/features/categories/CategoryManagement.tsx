import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiEdit2, FiTrash2, FiFolder } from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "../../shared/Popup/Modal";
import {
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
} from "../../services/category/handleCategory";
import { apiErrorMessage } from "../../types/Api";
import type { Category } from "../../types/Category";
import { formatCmsDate } from "../../utils/date";
import {
  PageHeader,
  EmptyState,
  ConfirmDialog,
  Pagination,
} from "../../shared/ui";

const PAGE_SIZE = 20;

// Manage categories with backend pagination, editing modal, and soft-delete confirmation.
const CategoryManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [name, setName] = useState("");

  const categories = useQuery({
    queryKey: ["categories", { page, pageSize: PAGE_SIZE }],
    queryFn: () => listCategories({ page, pageSize: PAGE_SIZE }),
  });

  // Invalidate and refetch cached category queries.
  const refresh = () => client.invalidateQueries({ queryKey: ["categories"] });

  // Reset and close the category creation and editing modal.
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setName("");
  };

  const create = useMutation({
    mutationFn: () => createCategory(name.trim()),
    onSuccess: () => {
      toast.success("Đã tạo danh mục.");
      closeForm();
      refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const rename = useMutation({
    mutationFn: () => updateCategory(editing!.id, name.trim()),
    onSuccess: () => {
      toast.success("Đã cập nhật danh mục.");
      closeForm();
      refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const restore = useMutation({
    mutationFn: restoreCategory,
    onSuccess: () => {
      toast.success("Đã khôi phục danh mục.");
      refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_, id) => {
      toast.success(
        <span>
          Đã xóa danh mục.{" "}
          <button
            type="button"
            onClick={() => restore.mutate(id)}
            className="underline font-semibold ml-1 text-primary-green hover:opacity-80"
          >
            Hoàn tác
          </button>
        </span>
      );
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Open the modal form for either creating a new category or renaming an existing one.
  const openForm = (category?: Category) => {
    setEditing(category ?? null);
    setName(category?.name ?? "");
    setFormOpen(true);
  };

  // Submit the active create or rename form.
  const submitForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    if (editing) rename.mutate();
    else create.mutate();
  };

  return (
    <section className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Danh mục bài viết"
        description="Quản lý hệ thống phân loại danh mục cho các bài viết CMS"
        actions={
          <button
            type="button"
            title="Tạo danh mục"
            aria-label="Tạo danh mục"
            onClick={() => openForm()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-green px-3.5 text-xs font-semibold text-primary-black shadow-sm transition-colors hover:bg-primary-green-dark"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tạo danh mục</span>
          </button>
        }
      />

      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden shadow-sm">
        {categories.isLoading ? (
          <div className="py-20 text-center text-sm text-content-muted">
            Đang tải dữ liệu danh mục...
          </div>
        ) : categories.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(categories.error)}
          </div>
        ) : (categories.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<FiFolder className="w-6 h-6 text-primary-green" />}
            title="Chưa có danh mục nào"
            description="Tạo danh mục đầu tiên để gán cho các bài viết trên hệ thống."
            action={
              <button
                type="button"
                title="Tạo danh mục ngay"
                aria-label="Tạo danh mục ngay"
                onClick={() => openForm()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-green px-3.5 text-xs font-semibold text-primary-black transition-colors hover:bg-primary-green-dark"
              >
                <FiPlus className="w-4 h-4" />
                <span>Tạo danh mục ngay</span>
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-content-muted border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Tên danh mục</th>
                    <th className="py-3 px-4">Ngày cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {categories.data?.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-hover/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-content-muted whitespace-nowrap">
                        {item.modifiedAt || item.modified_at
                          ? formatCmsDate(item.modifiedAt ?? item.modified_at!)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            title="Sửa danh mục"
                            aria-label="Sửa danh mục"
                            onClick={() => openForm(item)}
                            className="inline-flex size-8 items-center justify-center rounded border border-transparent text-cyan-400 transition-colors hover:border-cyan-800/40 hover:bg-cyan-950/30 hover:text-cyan-300"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Xóa danh mục"
                            aria-label="Xóa danh mục"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex size-8 items-center justify-center rounded border border-transparent text-rose-400 transition-colors hover:border-rose-800/40 hover:bg-rose-950/30 hover:text-rose-300"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
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
                page={categories.data?.page ?? page}
                totalPages={categories.data?.totalPages ?? 1}
                totalItems={categories.data?.total}
                itemUnit="danh mục"
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        className="max-w-md p-6"
        ariaLabel={editing ? "Cập nhật danh mục" : "Tạo danh mục mới"}
      >
        <form onSubmit={submitForm} className="space-y-4">
          <h2 className="text-lg font-bold text-content-primary">
            {editing ? "Cập nhật danh mục" : "Tạo danh mục mới"}
          </h2>
          <div>
            <label
              htmlFor="cat-name-input"
              className="block text-xs font-medium text-content-secondary mb-1.5"
            >
              Tên danh mục <span className="text-rose-400">*</span>
            </label>
            <input
              id="cat-name-input"
              data-autofocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên danh mục..."
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-xs font-medium rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-elevated border border-surface-border transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending || rename.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-green hover:bg-primary-green-dark text-primary-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {create.isPending || rename.isPending ? "Đang lưu..." : "Lưu danh mục"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa danh mục"
        message={`Danh mục "${deleteTarget?.name}" sẽ được xóa khỏi danh sách sử dụng nhưng không bị xóa vĩnh viễn khỏi cơ sở dữ liệu.`}
        confirmLabel="Xóa danh mục"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
};

export default CategoryManagement;
