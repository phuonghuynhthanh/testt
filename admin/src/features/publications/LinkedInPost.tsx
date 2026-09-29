import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBlogDetail } from "../../services/blog/handleBlog";
import LoadingPage from "../../shared/loading/LoadingPage";
import PublicationPanel from "./components/PublicationPanel";

// Render one Blog's dedicated LinkedIn configuration and post-review workspace.
const LinkedInPost = () => {
  const { blog_id: blogId } = useParams<{ blog_id: string }>();
  const { data: blog, isLoading, isError } = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId as string),
    enabled: Boolean(blogId),
    retry: false,
  });

  if (isLoading) return <LoadingPage />;
  if (isError || !blogId || !blog) {
    return <p className="text-red-300">Không thể tải bài viết này.</p>;
  }

  return (
    <section className="mx-auto max-w-5xl text-gray-th2">
      <Link to="/linkedin" className="text-sm text-blue-300 hover:underline">
        ← Quản lý LinkedIn
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-primary-white">{blog.title}</h1>
      <p className="mt-1 text-sm text-gray-400">
        Quản lý bài đăng LinkedIn độc lập với trình chỉnh sửa nội dung bài viết.
      </p>
      <PublicationPanel
        blogId={blogId}
        blogSaveVersion={0}
        blogState={blog.state}
        linkedinWorkspace
      />
    </section>
  );
};

export default LinkedInPost;
