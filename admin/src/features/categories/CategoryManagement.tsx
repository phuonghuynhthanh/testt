import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const PAGE_SIZE = 20;

// Manage categories with backend pagination and immediate soft-delete undo.
const CategoryManagement = () => {
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

  // Refresh every cached category page after a mutation.
  const refresh = () => client.invalidateQueries({ queryKey: ["categories"] });

  // Close and clear the shared create/edit dialog.
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
          Đã xóa danh mục. <button onClick={() => restore.mutate(id)} className="underline">Hoàn tác</button>
        </span>,
      );
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Open the shared dialog for either a new or existing category.
  const openForm = (category?: Category) => {
    setEditing(category ?? null);
    setName(category?.name ?? "");
    setFormOpen(true);
  };

  // Submit the active create or rename command.
  const submitForm = () => {
    if (!name.trim()) return;
    if (editing) rename.mutate();
    else create.mutate();
  };

  return (
    <section className="mx-auto max-w-4xl text-gray-th2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-white">Danh mục</h1>
        <button onClick={() => openForm()} className="rounded bg-primary-green px-4 py-2 font-semibold text-primary-black">
          + Tạo danh mục
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded border border-gray-700">
        {categories.isLoading ? (
          <p className="p-6">Đang tải…</p>
        ) : categories.isError ? (
          <p className="p-6 text-red-300">{apiErrorMessage(categories.error)}</p>
        ) : (
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-primary-black-light text-primary-white">
              <tr><th className="p-3">Tên</th><th>Cập nhật</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {categories.data?.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-700">
                  <td className="p-3">{item.name}</td>
                  <td>{item.modifiedAt || item.modified_at ? formatCmsDate(item.modifiedAt ?? item.modified_at!) : "—"}</td>
                  <td className="space-x-3">
                    <button onClick={() => openForm(item)} className="text-blue-300">Sửa</button>
                    <button onClick={() => setDeleteTarget(item)} className="text-red-300">Xóa</button>
                  </td>
                </tr>
              ))}
              {categories.data?.items.length === 0 && <tr><td colSpan={3} className="p-6 text-center">Chưa có danh mục.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded bg-gray-700 px-3 py-2 disabled:opacity-50">Trước</button>
        <span>Trang {categories.data?.page ?? page} / {categories.data?.totalPages ?? 1} · {categories.data?.total ?? 0} danh mục</span>
        <button disabled={!categories.data || page >= categories.data.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded bg-gray-700 px-3 py-2 disabled:opacity-50">Sau</button>
      </div>

      <Modal isOpen={formOpen} onClose={closeForm}>
        <h2 className="text-xl font-semibold text-primary-white">{editing ? "Sửa danh mục" : "Tạo danh mục"}</h2>
        <label className="mt-4 block">Tên danh mục
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={closeForm}>Hủy</button>
          <button disabled={!name.trim() || create.isPending || rename.isPending} onClick={submitForm} className="rounded bg-primary-green px-4 py-2 text-primary-black">Lưu</button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <h2 className="text-xl font-semibold text-primary-white">Xóa danh mục</h2>
        <p className="mt-3">Danh mục sẽ được xóa khỏi danh sách sử dụng, không bị xóa vĩnh viễn.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)}>Hủy</button>
          <button disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} className="rounded bg-red-700 px-4 py-2 text-white">Xóa danh mục</button>
        </div>
      </Modal>
    </section>
  );
};

export default CategoryManagement;
