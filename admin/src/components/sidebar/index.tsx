import { IoMdAddCircleOutline } from "react-icons/io";
import { Link } from "react-router-dom";
import { MdArticle } from "react-icons/md";
import { FaLinkedin } from "react-icons/fa";
import { MdCategory } from "react-icons/md";
import Logout from "./components/Logout";

interface SidebarProps {
  onClose?: () => void;
}

// Render navigation for the blog CMS and the shared logout action.
const Sidebar = ({ onClose }: SidebarProps) => {
  // Close the mobile sidebar after a navigation link is selected.
  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="h-full overflow-y-auto lg:w-52 w-screen bg-primary-black border border-primary-white/60 flex flex-col px-2 py-6 shadow-lg">
      <h4 className="font-semibold text-primary-white">Bài viết</h4>
      <div className="flex flex-col gap-1">
        <Link to="/blog" onClick={handleLinkClick}>
          <div className="transition-all duration-300 ease-in-out text-primary-white/80 bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <MdArticle className="text-xl " />
            <span className="truncate">Quản lý bài viết</span>
          </div>
        </Link>
        <Link to="/blog/create-blog" onClick={handleLinkClick}>
          <div className="transition-all duration-300  text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <IoMdAddCircleOutline className="text-xl " />
            <span className="truncate">Tạo bài viết</span>
          </div>
        </Link>
        <Link to="/linkedin" onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <FaLinkedin className="text-xl" />
            <span className="truncate">Quản lý LinkedIn</span>
          </div>
        </Link>
        <Link to="/categories" onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <MdCategory className="text-xl" />
            <span className="truncate">Danh mục</span>
          </div>
        </Link>
      </div>

      <div className="mt-auto text-primary-white">
        <Logout />
      </div>
    </div>
  );
};

export default Sidebar;
