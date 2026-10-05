import React from "react";
import { Pagination } from "../../../shared/ui";

interface LinkedInPaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

// Render the shared pager with the LinkedIn list's page-size options.
export const LinkedInPagination: React.FC<LinkedInPaginationProps> = ({
  page,
  totalPages,
  totalItems = 0,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) => (
  <Pagination
    page={page}
    totalPages={totalPages}
    totalItems={totalItems}
    itemUnit="bài đăng"
    pageSize={pageSize}
    pageSizeOptions={[5, 10, 20]}
    onPageSizeChange={onPageSizeChange}
    onPageChange={onPageChange}
  />
);

export default LinkedInPagination;
