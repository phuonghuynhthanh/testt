import React from "react";
import { PageHeader } from "../../../shared/ui";
import BlogResearchTools from "../components/BlogResearchTools";

// Render a dedicated workspace for collecting and assessing blog references.
const BlogResearch: React.FC = () => {
  return (
    <section className="mx-auto max-w-[840px]">
      <PageHeader
        title="Tìm nguồn tham khảo"
        description="Tìm, phân loại và trích xuất nguồn trước khi bắt đầu soạn bài viết."
      />
      <BlogResearchTools />
    </section>
  );
};

export default BlogResearch;
