import { useParams } from "react-router-dom";
import BlogCreate from "../blog-create";

// Edit an existing blog with the same editor used for creation.
const BlogUpdate = () => {
  const { blog_id: blogId } = useParams<{ blog_id: string }>();
  return <BlogCreate key={blogId} blogId={blogId} />;
};

export default BlogUpdate;
