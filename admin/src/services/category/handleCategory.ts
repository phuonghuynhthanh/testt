import getAxiosClient from "../../lib/axios/axiosClient";
import type { PaginatedResponse } from "../../types/Api";
import type { Category } from "../../types/Category";

// Fetch one backend-paginated category page.
export const listCategories = async (
  params = { page: 1, pageSize: 100 },
): Promise<PaginatedResponse<Category>> =>
  (await getAxiosClient().get("/categories", { params })).data;

// Create a category explicitly from the management page.
export const createCategory = async (name: string) =>
  (await getAxiosClient().post<Category>("/categories", { name })).data;

// Rename a category and let the backend synchronize its blogs.
export const updateCategory = async (id: string, name: string) =>
  (await getAxiosClient().put<Category>(`/categories/${id}`, { name })).data;

// Soft-delete a category.
export const deleteCategory = async (id: string) =>
  (await getAxiosClient().delete(`/categories/${id}`)).data;

// Restore a recently deleted category by its retained ID.
export const restoreCategory = async (id: string) =>
  (await getAxiosClient().post<Category>(`/categories/${id}/restore`)).data;
