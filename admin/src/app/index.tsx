import { Suspense } from "react";
import LoadingPage from "../shared/loading/LoadingPage";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import MainLayout from "../components/layout/MainLayout";
import { PATH } from "./store";
import Login from "../features/auth/Login";
import { AgentCreateBlog } from "../features/blogs/blog-seo-ai";
import BlogUpdate from "../features/blogs/components/BlogUpdate";
import BlogCreate from "../features/blogs/blog-create";
import BlogManagement from "../features/blogs/blog-management";
import CourseManagement from "../features/course/course-management";
import StudentManagement from "../features/course/student-management";
import StudentManagementDetail from "../features/course/student-management/StudentDetail";
import StudentTestSummary from "../features/course/student-management/test-summary";
import CourseUserManagement from "../features/course/user-management";
import CourseUserManagementDetail from "../features/course/user-management/UserManagementDetail";
import CourseUserStrategyDetail from "../features/course/user-management/StrategyDetail";
import CourseCertificateManagement from "../features/course/course-certificate";

const App = () => {
  return (
    <div className="relative bg-primary-black">
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          {/* Public routes */}
          <Route path={PATH.LOGIN} element={<Login />} />

          <Route path="/" element={<PrivateRoute element={<MainLayout />} />}>
            <Route index element={<Navigate to={PATH.BLOG} />} />

            <Route path={PATH.BLOG} element={<BlogManagement />} />
            <Route path={PATH.CREATE_BLOG} element={<BlogCreate />} />
            <Route path={PATH.EDIT_BLOG} element={<BlogUpdate />} />
            <Route path={PATH.COURSE} element={<CourseManagement />} />
            <Route
              path={PATH.STUDENT_MANAGEMENT}
              element={<StudentManagement />}
            />
            <Route
              path={PATH.STUDENT_TEST_SUMMARY}
              element={<StudentTestSummary />}
            />
            <Route
              path={PATH.STUDENT_MANAGEMENT_DETAIL}
              element={<StudentManagementDetail />}
            />
            <Route
              path={PATH.COURSE_USERS}
              element={<CourseUserManagement />}
            />
            <Route
              path={PATH.COURSE_USERS_DETAIL}
              element={<CourseUserManagementDetail />}
            />
            <Route
              path={PATH.COURSE_USER_STRATEGY_DETAIL}
              element={<CourseUserStrategyDetail />}
            />
            <Route
              path={PATH.COURSE_CERTIFICATES}
              element={<CourseCertificateManagement />}
            />
            {/* <Route path={PATH.AGENT_CREATE_BLOG} element={<AgentCreateBlog/>} /> */}
            <Route
              path={PATH.AGENT_CREATE_BLOG}
              element={<AgentCreateBlog />}
            />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;
