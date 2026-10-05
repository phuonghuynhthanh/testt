import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, PencilSimple, Trash, Folder } from "@phosphor-icons/react";
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
import { formatCmsDateOnly } from "../../utils/date";
import { PageHeader, EmptyState, ConfirmDialog, Pagination } from "../../shared/ui";

const PAGE_SIZE = 10;

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
    placeholderData: keepPreviousData,
  });

  const totalPages = Math.max(1, categories.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const refresh = () => client.invalidateQueries({ queryKey: ["categories"] });

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

  const openForm = (category?: Category) => {
    setEditing(category ?? null);
    setName(category?.name ?? "");
    setFormOpen(true);
  };

  const submitForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    if (editing) rename.mutate();
    else create.mutate();
  };

  return (
    <section className="max-w-[968px] mx-auto">
      <PageHeader
        title="Danh mục bài viết"
        description="Quản lý hệ thống phân loại danh mục cho các bài viết CMS"
        actions={
          <button
            type="button"
            onClick={() => openForm()}
            className="btn btn-primary btn-lg"
          >
            <Plus size={16} weight="light" />
            <span>Tạo danh mục</span>
          </button>
        }
      />

      <div className="panel p-0 overflow-hidden">
        {categories.isLoading ? (
          <div className="py-20 text-center text-xs text-content-muted">
            Đang tải dữ liệu danh mục...
          </div>
        ) : categories.isError ? (
          <div className="py-12 text-center text-xs text-rose-400">
            {apiErrorMessage(categories.error)}
          </div>
        ) : (categories.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Folder weight="light" className="w-6 h-6 text-primary-green" />}
            title="Chưa có danh mục nào"
            description="Tạo danh mục đầu tiên để gán cho các bài viết trên hệ thống."
            action={
              <button
                type="button"
                onClick={() => openForm()}
                className="btn btn-primary"
              >
                <Plus size={16} weight="light" />
                <span>Tạo danh mục ngay</span>
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-surface-border bg-surface-elevated/60 text-xs font-semibold uppercase tracking-[0.05em] text-content-muted">
                  <tr>
                    <th className="px-3 py-2">Tên danh mục</th>
                    <th className="px-3 py-2">Ngày cập nhật</th>
                    <th className="px-3 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {categories.data?.items.map((item) => (
                    <tr key={item.id} className="hrow row-in transition-colors duration-300 hover:bg-surface-hover/50">
                      <td className="px-3 py-2 font-medium text-content-primary">
                        {item.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-content-muted">
                        {item.modifiedAt || item.modified_at
                          ? formatCmsDateOnly(item.modifiedAt ?? item.modified_at!)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="row-actions inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Sửa danh mục"
                            onClick={() => openForm(item)}
                            className="iconbtn cyan"
                            aria-label="Sửa danh mục"
                          >
                            <PencilSimple size={18} weight="light" />
                          </button>
                          <button
                            type="button"
                            title="Xóa danh mục"
                            onClick={() => setDeleteTarget(item)}
                            className="iconbtn danger"
                            aria-label="Xóa danh mục"
                          >
                            <Trash size={18} weight="light" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
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
        className="max-w-md p-5"
        ariaLabel={editing ? "Cập nhật danh mục" : "Tạo danh mục mới"}
      >
        <form onSubmit={submitForm} className="space-y-4">
          <h2 className="text-base font-bold text-content-primary">
            {editing ? "Cập nhật danh mục" : "Tạo danh mục mới"}
          </h2>
          <div>
            <label htmlFor="cat-name-input" className="block text-xs font-medium text-content-secondary mb-1">
              Tên danh mục <span className="text-rose-400">*</span>
            </label>
            <input
              id="cat-name-input"
              data-autofocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên danh mục..."
              className="inp text-xs h-8"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
            <button type="button" onClick={closeForm} className="btn btn-secondary">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending || rename.isPending}
              className="btn btn-primary"
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
