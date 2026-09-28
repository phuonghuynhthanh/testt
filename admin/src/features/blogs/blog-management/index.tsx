import ListBlogs from "./components/ListBlogs";
import { useState } from "react";
import ListBlogsPending from "./components/ListBlogsPending";

const BlogManagement = () => {
  const [currentTab, setCurrentTab] = useState<number>(1);

  const renderTabContent = () => {
    switch (currentTab) {
      case 1:
        return <ListBlogs />;
      case 2:
        return <ListBlogsPending />;

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-full w-full text-gray-th2">
      <div className="w-full h-max flex text-center text-2xl font-semibold mb-6 text-primary-white">
        <div
          className={`${
            currentTab === 1 ? "border-b-2 border-gray-th2" : "bg-transparent"
          } flex-1 w-full py-1 hover:cursor-pointer transition-colors duration-200 ease-in-out`}
          onClick={() => setCurrentTab(1)}
        >
          All Blogs
        </div>
        <div
          className={`${
            currentTab === 2 ? "border-b-2 border-gray-th2" : "bg-transparent"
          } flex-1 w-full py-1 hover:cursor-pointer transition-colors duration-200 ease-in-out`}
          onClick={() => setCurrentTab(2)}
        >
          Pending Blogs
        </div>
      </div>
      {renderTabContent()}
    </div>
  );
};

export default BlogManagement;
