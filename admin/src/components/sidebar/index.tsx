import { IoMdAddCircleOutline } from "react-icons/io";
import { Link } from "react-router-dom";
import { MdArticle } from "react-icons/md";
import { FiBarChart2 } from "react-icons/fi";
import { RiRobot3Line } from "react-icons/ri";
import { PiNotebook } from "react-icons/pi";
import { PiStudent } from "react-icons/pi";
import { PiUsersThree } from "react-icons/pi";
import { PiCertificate } from "react-icons/pi";
import Logout from "./components/Logout";
import { PATH } from "../../app/store";

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="h-full overflow-y-auto lg:w-52 w-screen bg-primary-black border border-primary-white/60 flex flex-col px-2 py-6 shadow-lg">
      <h4 className="font-semibold text-primary-white">Blog</h4>
      <div className="flex flex-col gap-1">
        <Link to="/blog" onClick={handleLinkClick}>
          <div className="transition-all duration-300 ease-in-out text-primary-white/80 bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <MdArticle className="text-xl " />
            <span className="truncate">Blog Management</span>
          </div>
        </Link>
        <Link to="/blog/create-blog" onClick={handleLinkClick}>
          <div className="transition-all duration-300  text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <IoMdAddCircleOutline className="text-xl " />
            <span className="truncate">Create Blog</span>
          </div>
        </Link>
        <Link to="/blog/agent-create-blog" onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <RiRobot3Line className="text-xl " />
            <span className="truncate">Agent Create Blog</span>
          </div>
        </Link>
      </div>

      <h4 className="mt-5 font-semibold text-primary-white">Course</h4>
      <div className="flex flex-col gap-1">
        <Link to="/course" onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <PiNotebook className="text-xl " />
            <span className="truncate">Course Management</span>
          </div>
        </Link>
        <Link to="/course/student-management" onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <PiStudent className="text-xl " />
            <span className="truncate">Student Management</span>
          </div>
        </Link>
        <Link to={PATH.STUDENT_TEST_SUMMARY} onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <FiBarChart2 className="text-xl " />
            <span className="truncate">Test Summary</span>
          </div>
        </Link>
        <Link to={PATH.COURSE_USERS} onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <PiUsersThree className="text-xl " />
            <span className="truncate">User Packages</span>
          </div>
        </Link>
        <Link to={PATH.COURSE_CERTIFICATES} onClick={handleLinkClick}>
          <div className="transition-all duration-300 text-primary-white/80 ease-in-out bg-transparent flex gap-2 hover:text-primary-white items-center h-10 hover:cursor-pointer hover:bg-gray-hover p-4 rounded-lg">
            <PiCertificate className="text-xl " />
            <span className="truncate">Certificates</span>
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
