// ListBlogsPending.tsx
import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from "react-icons/ti";

import { toast } from "react-toastify";
import { TbCircleCheck, TbRefresh } from "react-icons/tb";
import { FaBan } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { IoIosCheckmarkCircle } from "react-icons/io";
import {
  categories,
  getListBlogsWithState,
  updateBlog,
} from "../../../../services/blog/handleBlog";
import type { IBlogItemData } from "../../../../types/Blog";
import LoadingPage from "../../../../shared/loading/LoadingPage";

// Render pending blogs and their approval controls.
const ListBlogsPending: React.FC = () => {
  const {
    data: blogsPending,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["blogs", "pending"],
    queryFn: () => getListBlogsWithState("PENDING"),
    staleTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();

  // Update one blog state and refresh each affected list.
  const handleUpdateStateBlogPost = async (
    blogId: string,
    state: "PENDING" | "APPROVED" | "REJECTED",
  ) => {
    const loadingToastId = toast.loading("Đang xử lý...");
    try {
      await updateBlog({
        id: blogId,
        state: state,
      });
      const stateLabel =
        state === "APPROVED"
          ? "phê duyệt"
          : state === "REJECTED"
            ? "từ chối"
            : "chuyển sang chờ duyệt";
      toast.update(loadingToastId, {
        render: `Bài viết đã được ${stateLabel}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
    } catch {
      toast.update(loadingToastId, {
        render: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // Approve every pending blog while reporting partial failures.
  const handleApproveAll = async () => {
    if (!blogsPending || blogsPending.length === 0) {
      toast.info("Không có bài viết nào đang chờ duyệt");
      return;
    }

    const pendingBlogs = blogsPending.filter(
      (blog) => blog.state === "PENDING",
    );

    if (pendingBlogs.length === 0) {
      toast.info("Không có bài viết nào đang chờ duyệt");
      return;
    }

    const loadingToastId = toast.loading("Đang duyệt tất cả bài viết chờ duyệt...");

    let successCount = 0;
    let failedCount = 0;

    try {
      // Process blogs sequentially to avoid crashes when data updates
      for (const blog of pendingBlogs) {
        try {
          await updateBlog({
            id: blog.id,
            state: "APPROVED",
          });
          successCount++;
        } catch {
          failedCount++;
        }
      }

      toast.update(loadingToastId, {
        render: `Đã duyệt ${successCount} bài viết, ${failedCount} bài viết thất bại.`,
        type: failedCount > 0 ? "warning" : "success",
        isLoading: false,
        autoClose: 4000,
      });

      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
    } catch {
      toast.update(loadingToastId, {
        render: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  // Define columns for the table
  const columns: ColumnDef<IBlogItemData>[] = [
    {
      accessorKey: "modified_at",
      header: "Cập nhật lần cuối",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleString();
      },
    },
    {
      accessorKey: "title",
      header: "Tiêu đề",
      cell: ({ getValue }) => (
        <div className="w-[150px] overflow-hidden whitespace-nowrap text-ellipsis">
          {getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: "tag",
      header: "Thẻ",
    },
    {
      accessorKey: "category",
      header: "Danh mục",
      cell: ({ getValue }) => {
        return (
          <div className="w-[150px] overflow-hidden whitespace-nowrap text-ellipsis">
            {
              categories.find((category) => category.value === getValue())
                ?.label
            }
          </div>
        );
      },
    },
    {
      accessorKey: "state",
      header: "Trạng thái",
      cell: ({ getValue, row }) => {
        const blogId = row.original.id;

        return (
          <div className="flex justify-start items-center">
            {`${getValue()}` === "PENDING" && (
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-1 hover:cursor-pointer group text-green-500`}
                  onClick={() => handleUpdateStateBlogPost(blogId, "APPROVED")}
                  disabled={getValue() !== "PENDING"}
                >
                  <TbCircleCheck className="size-6 shrink-0" />
                  <span className="group-hover:underline underline-offset-2">
                    Duyệt
                  </span>
                </button>
                <div className="h-6 w-0.5 bg-gray-300"></div>
                <button
                  className={`flex items-center gap-1 hover:cursor-pointer group text-red-500`}
                  onClick={() => handleUpdateStateBlogPost(blogId, "REJECTED")}
                  disabled={getValue() !== "PENDING"}
                >
                  <FaBan className="size-5 shrink-0" />
                  <span className="group-hover:underline underline-offset-2">
                    Từ chối
                  </span>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // Create a table instance with sorting and filtering
  const table = useReactTable({
    data: blogsPending || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return <LoadingPage />;
  } else
    return (
      <div className="w-full h-full text-gray-700">
        <div className="flex w-full justify-between items-center">
          <div
            className="flex justify-center text-primary-white items-center gap-2 group hover:cursor-pointer underline-offset-4 hover:underline"
            onClick={() => refetch()}
          >
            <span>Làm mới danh sách</span>
            <TbRefresh className="group-hover:rotate-180 transition-all duration-300" />
          </div>
          <div
            className="flex justify-center items-center gap-1 group hover:cursor-pointer underline-offset-4 hover:underline text-green-500"
            onClick={handleApproveAll}
          >
            <span>Duyệt tất cả</span>
            <IoIosCheckmarkCircle className="size-4 group-hover:scale-125 transition-all duration-300" />
          </div>
        </div>
        <hr className="my-3" />
        <div className="w-full h-full overflow-y-auto">
          <div className="w-full h-full">
            {!isError && blogsPending && (
              <table className="table-auto w-full">
                <thead className="text-lg font-medium sticky top-0 bg-gray-800 text-white">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className="p-2 hover:cursor-pointer select-none"
                        >
                          <div className="font-semibold text-left flex items-center">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.columnDef.header !== "" &&
                              (header.column.getIsSorted() ? (
                                header.column.getIsSorted() === "desc" ? (
                                  <TiArrowSortedDown className="h-4 w-auto" />
                                ) : (
                                  <TiArrowSortedUp className="h-4 w-auto" />
                                )
                              ) : (
                                <TiArrowUnsorted className="h-4 w-auto" />
                              ))}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-primary-black-light">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2 text-primary-white">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
};

export default ListBlogsPending;
