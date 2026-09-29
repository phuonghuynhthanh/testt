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
import { BiLoaderCircle, BiSolidEditAlt } from "react-icons/bi";
import { MdOutlineDelete } from "react-icons/md";

import { toast } from "react-toastify";
import { FaBan } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TbCircleCheck, TbRefresh } from "react-icons/tb";
import { MdClose, MdSearch } from "react-icons/md";

import {
  categories,
  deleteBlog,
  getBlogDetail,
  getListBlogs,
  updateBlog,
} from "../../../../services/blog/handleBlog";
import type { IBlogItemData } from "../../../../types/Blog";
import { DOMAIN_WEBSITE, IMAGE_URL } from "../../../../config/config";
import LoadingPage from "../../../../shared/loading/LoadingPage";
import { fixEscapedMarkdownSyntax } from "../../../../utils/markdown";

type BlogStateFilter = "ALL" | "PENDING" | "APPROVED";

// Normalize text so searching works with Vietnamese accents and casing differences.
const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

// Filter blogs by title and state while preserving the original list order.
const filterBlogs = (
  blogs: IBlogItemData[],
  searchValue: string,
  stateFilter: BlogStateFilter,
) => {
  const normalizedSearch = normalizeSearchText(searchValue);

  return blogs.filter(
    (blog) =>
      (stateFilter === "ALL" || blog.state === stateFilter) &&
      (!normalizedSearch ||
        normalizeSearchText(blog.title).includes(normalizedSearch)),
  );
};

// Keep only states that should be changed by the bulk markdown fix action.
const isFixableBlogState = (state: IBlogItemData["state"]) =>
  state === "PENDING" || state === "APPROVED";

// Build a configured public media URL from the object key returned by MinIO.
const getBlogBannerImageUrl = (bannerUrl: string) => {
  if (!bannerUrl || !IMAGE_URL) return "";
  if (/^https?:\/\//.test(bannerUrl)) return bannerUrl;
  return `${IMAGE_URL}/${bannerUrl.replace(/^\/+/, "")}`;
};

const ListBlogs = () => {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState<BlogStateFilter>("ALL");
  const [isFixingAll, setIsFixingAll] = React.useState(false);
  const {
    data: listBlogs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["blogs"],
    queryFn: getListBlogs,
    staleTime: 60 * 60 * 1000, // 60 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Keep the table data in sync with the search input without mutating query data.
  const filteredBlogs = React.useMemo(
    () => filterBlogs(listBlogs || [], searchValue, stateFilter),
    [listBlogs, searchValue, stateFilter],
  );

  // Build the list of currently visible blogs that can safely be fixed in bulk.
  const fixableBlogs = React.useMemo(
    () => filteredBlogs.filter((blog) => isFixableBlogState(blog.state)),
    [filteredBlogs],
  );

  const handleDeleteBlog = async (blogId: string) => {
    const userConfirmation = window.prompt(
      'Type "delete" to confirm deletion:',
    );
    if (userConfirmation !== "delete") return;

    // Show loading toast
    const loadingToastId = toast.loading("Deleting...");

    try {
      await deleteBlog(blogId);
      toast.update(loadingToastId, {
        render: "Delete successful.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
    } catch (error) {
      toast.update(loadingToastId, {
        render: `${error}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleEditBlog = (blogId: string) => {
    window.open(`blog/default/${blogId}`, "_blank", "noopener,noreferrer");
  };

  // Fetch, normalize, and save markdown content for all visible fixable blogs.
  const handleFixAllMarkdownSyntax = async () => {
    if (fixableBlogs.length === 0) {
      toast.info("No PENDING or APPROVED blogs match the current filter.");
      return;
    }

    const userConfirmation = window.prompt(
      `Type "fix" to fix markdown syntax for ${fixableBlogs.length} visible PENDING/APPROVED blogs:`,
    );
    if (userConfirmation !== "fix") return;

    const loadingToastId = toast.loading("Fixing markdown syntax...");
    let fixedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    setIsFixingAll(true);
    try {
      for (const [index, blog] of fixableBlogs.entries()) {
        toast.update(loadingToastId, {
          render: `Fixing ${index + 1}/${fixableBlogs.length}: ${blog.title}`,
          isLoading: true,
        });

        try {
          const blogDetail = await getBlogDetail(blog.id);
          const fixedContent = fixEscapedMarkdownSyntax(blogDetail.content);

          if (fixedContent === blogDetail.content) {
            skippedCount += 1;
            continue;
          }

          await updateBlog({
            ...blogDetail,
            content: fixedContent,
          });
          fixedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });
      await refetch();

      toast.update(loadingToastId, {
        render: `Fix all completed. Fixed: ${fixedCount}, skipped: ${skippedCount}, failed: ${failedCount}.`,
        type: failedCount > 0 ? "warning" : "success",
        isLoading: false,
        autoClose: 4500,
      });
    } finally {
      setIsFixingAll(false);
    }
  };

  // Define columns for the table
  const columns: ColumnDef<IBlogItemData>[] = [
    {
      accessorKey: "banner_url",
      header: "Banner",
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const imageUrl = getBlogBannerImageUrl(getValue() as string);

        if (!imageUrl) {
          return (
            <div className="flex size-14 items-center justify-center rounded-md border border-white/10 bg-primary-black-medium text-xs text-primary-white/40">
              No image
            </div>
          );
        }

        return (
          <img
            src={imageUrl}
            alt={`${row.original.title} banner`}
            loading="lazy"
            className="size-14 rounded-md border border-white/10 object-cover bg-primary-black-medium"
          />
        );
      },
    },
    {
      accessorKey: "modified_at",
      header: "Last Updated",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleString();
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ getValue }) => (
        <div className="w-[150px] overflow-hidden whitespace-nowrap text-ellipsis">
          {getValue() as string}
        </div>
      ),
    },
    ...[
      {
        accessorKey: "tag",
        header: "Tag",
      },
    ],
    {
      accessorKey: "category",
      header: "Category",
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
      accessorKey: "link_post",
      header: "Link Post",
      cell: ({ getValue }) => (
        <a
          href={`${DOMAIN_WEBSITE}/blog/${getValue()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:cursor-pointer underline-offset-4 hover:underline text-blue-500"
        >
          View
        </a>
      ),
    },
    {
      accessorKey: "state",
      header: "Blog State",
      cell: ({ getValue }) => {
        return (
          <div className="flex justify-center items-center">
            {`${getValue()}` === "PENDING" && (
              <span
                className="flex items-center gap-1 text-yellow-500"
                title={getValue() as string}
              >
                <BiLoaderCircle className="size-7 rounded-sm p-0.5 shrink-0" />
              </span>
            )}
            {`${getValue()}` === "APPROVED" && (
              <span
                className="flex items-center gap-1 text-green-500"
                title={getValue() as string}
              >
                <TbCircleCheck className="size-7 rounded-sm p-0.5 shrink-0" />
              </span>
            )}

            {`${getValue()}` === "REJECTED" && (
              <span
                className="flex items-center gap-1 text-red-500"
                title={getValue() as string}
              >
                <FaBan className="size-7 rounded-sm p-1 shrink-0" />
              </span>
            )}
          </div>
        );
      },
    },

    {
      accessorKey: "id",
      header: "",
      cell: ({ getValue }) => (
        <div className="text-2xl flex justify-between items-center gap-2">
          <BiSolidEditAlt
            title="Edit Blog"
            onClick={() => handleEditBlog(getValue() as string)}
            className="hover:cursor-pointer shrink-0 p-0.5  size-7 rounded-sm text-primary-green hover:text-primary-green-dark"
          />
          <div className="h-6 w-0.5 bg-gray-300"></div>
          <MdOutlineDelete
            title="Delete Blog"
            onClick={() => handleDeleteBlog(getValue() as string)}
            className="hover:cursor-pointer shrink-0 p-0.5  size-7 rounded-sm text-red-500 hover:bg-red-500/15"
          />
        </div>
      ),
    },
  ];

  // Create a table instance with sorting and filtering
  const table = useReactTable({
    data: filteredBlogs,
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
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div
            className="flex justify-center text-primary-white items-center gap-2 group hover:cursor-pointer underline-offset-4 hover:underline"
            onClick={() => refetch()}
          >
            <span>Refresh List Blogs</span>
            <TbRefresh className="group-hover:rotate-180 transition-all duration-300" />
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[620px]">
            <label
              htmlFor="blog-title-search"
              className="text-sm font-medium text-primary-white"
            >
              Search blogs
            </label>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-500 bg-primary-black-medium px-3 py-2 text-primary-white focus-within:border-primary-green">
                <MdSearch className="size-5 shrink-0 text-gray-300" />
                <input
                  id="blog-title-search"
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Enter blog title..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                {searchValue && (
                  <button
                    type="button"
                    aria-label="Clear blog title search"
                    className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-primary-white"
                    onClick={() => setSearchValue("")}
                  >
                    <MdClose className="size-4" />
                  </button>
                )}
              </div>
              <select
                className="rounded-lg border border-gray-500 bg-primary-black-medium px-3 py-2 text-sm text-primary-white outline-none focus:border-primary-green"
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(event.target.value as BlogStateFilter)
                }
              >
                <option value="ALL">All states</option>
                <option value="PENDING">PENDING only</option>
                <option value="APPROVED">APPROVED only</option>
              </select>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleFixAllMarkdownSyntax}
                disabled={isFixingAll || fixableBlogs.length === 0}
              >
                {isFixingAll ? "Fixing..." : "Fix all"}
              </button>
            </div>
            <span className="text-xs text-gray-300">
              Showing {filteredBlogs.length} of {listBlogs?.length || 0} blogs.
              Fix all will update {fixableBlogs.length} visible PENDING/APPROVED
              blogs.
            </span>
          </div>
        </div>
        <hr className="my-3" />
        <div className="w-full h-full overflow-y-auto">
          <div className="w-full h-full">
            {!isError && listBlogs && (
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

export default ListBlogs;
