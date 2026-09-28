import { Outlet } from "react-router-dom";

const Blog = () => {
  return (
    <div className="w-full h-full relative">
      <Outlet />
    </div>
  );
};

export default Blog;
