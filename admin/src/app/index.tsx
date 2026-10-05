import { Suspense } from "react";
import LoadingPage from "../shared/loading/LoadingPage";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import MainLayout from "../components/layout/MainLayout";
import { PATH } from "./store";
import Login from "../features/auth/Login";
import BlogUpdate from "../features/blogs/components/BlogUpdate";
import BlogCreate from "../features/blogs/blog-create";
import BlogResearch from "../features/blogs/research";
import BlogManagement from "../features/blogs/blog-management";
import LinkedInManagement from "../features/publications/LinkedInManagement";
import LinkedInPost from "../features/publications/LinkedInPost";
import CategoryManagement from "../features/categories/CategoryManagement";
import PublicBlogPreview from "../features/blogs/public-preview/PublicBlogPreview";
import PublicationManagement from "../features/publications/PublicationManagement";
import PublicationConfigPage from "../features/publications/PublicationConfigPage";
import BlogDetailPage from "../features/blogs/blog-detail/BlogDetailPage";

// Define the authenticated blog routes and the public login route.
const App = () => {
  return (
    <div className="relative min-h-screen bg-surface-base text-content-primary">
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          {/* Public routes */}
          <Route path={PATH.LOGIN} element={<Login />} />

          <Route path="/" element={<PrivateRoute element={<MainLayout />} />}>
            <Route index element={<Navigate to={PATH.BLOG} />} />

            <Route path={PATH.BLOG} element={<BlogManagement />} />
            <Route path={PATH.CREATE_BLOG} element={<BlogCreate />} />
            <Route path={PATH.BLOG_RESEARCH} element={<BlogResearch />} />
            <Route path={PATH.PUBLIC_PREVIEW} element={<PublicBlogPreview />} />
            <Route path={PATH.CATEGORIES} element={<CategoryManagement />} />
            <Route path={PATH.EDIT_BLOG} element={<BlogUpdate />} />
            <Route path={PATH.BLOG_DETAIL} element={<BlogDetailPage />} />
            <Route path={PATH.PUBLICATIONS} element={<PublicationManagement />} />
            <Route path={PATH.PUBLICATION_CONFIG} element={<PublicationConfigPage />} />
            <Route path={PATH.LINKEDIN} element={<LinkedInManagement />} />
            <Route path={PATH.LINKEDIN_NEW} element={<LinkedInPost />} />
            <Route path={PATH.LINKEDIN_POST} element={<LinkedInPost />} />
          </Route>

          {/* Catch-all fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;
