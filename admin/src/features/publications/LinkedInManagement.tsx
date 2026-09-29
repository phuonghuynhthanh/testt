import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaLinkedin } from "react-icons/fa";
import { getListBlogs } from "../../services/blog/handleBlog";
import LoadingPage from "../../shared/loading/LoadingPage";

// List Blogs as LinkedIn post work items without unsupported publication-list APIs.
const LinkedInManagement = () => {
  const [search, setSearch] = useState("");
  const { data: blogs = [], isLoading, isError } = useQuery({
    queryKey: ["blogs"],
    queryFn: getListBlogs,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Filter the existing Blog list locally to avoid additional backend requests.
  const filteredBlogs = useMemo(
    () =>
      blogs.filter((blog) =>
        blog.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [blogs, search],
  );

  if (isLoading) return <LoadingPage />;
  if (isError) return <p className="text-red-300">Không thể tải danh sách bài viết.</p>;

  return (
    <section className="mx-auto max-w-5xl text-gray-th2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-primary-white">
            <FaLinkedin className="text-[#0a66c2]" /> Quản lý xuất bản LinkedIn
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            Chọn một bài viết để cấu hình, xem trước và xuất bản bài đăng lên LinkedIn.
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm kiếm bài viết..."
          className="rounded border border-gray-600 bg-primary-black px-3 py-2 text-primary-white outline-none focus:border-blue-400"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-700">
        {filteredBlogs.map((blog) => (
          <Link
            key={blog.id}
            to={`/linkedin/${blog.id}`}
            className="flex items-center justify-between gap-4 border-b border-gray-700 p-4 transition hover:bg-primary-black-light last:border-b-0"
          >
            <div>
              <h2 className="font-semibold text-primary-white">{blog.title}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {blog.category} · Website: {blog.state === "APPROVED" ? "Đã duyệt" : blog.state === "PENDING" ? "Chờ duyệt" : "Từ chối"}
              </p>
            </div>
            <span className="rounded bg-[#0a66c2] px-3 py-2 text-sm font-medium text-white">
              Quản lý bài đăng
            </span>
          </Link>
        ))}
        {filteredBlogs.length === 0 && (
          <p className="p-6 text-center text-gray-400">Không tìm thấy bài viết nào.</p>
        )}
      </div>
    </section>
  );
};

export default LinkedInManagement;
