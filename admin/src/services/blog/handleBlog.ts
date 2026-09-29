import type {
  IBlogData,
  IBlogItemData,
  IBlogUpdateData,
} from "../../types/Blog";
import getAxiosClient from "../../lib/axios/axiosClient";

// Create a new blog post with multipart form data.
export const createBlogPost = async (blogData: IBlogData, fileImage: File) => {
  try {
    const axiosClient = getAxiosClient();
    const formData = new FormData();
    formData.append("image", fileImage);
    formData.append("blog_data", JSON.stringify(blogData));

    const response = await axiosClient.post("/blog", formData);
    return response.data;
  } catch {
    throw new Error("Lỗi khi tạo bài viết");
  }
};

// Fetch all blog posts for administration.
export const getListBlogs = async (): Promise<IBlogItemData[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<IBlogItemData[]>(
      "/blog/admin/blogs",
    );
    return response.data;
  } catch {
    throw new Error("Không thể lấy danh sách bài viết");
  }
};

// Fetch blog posts filtered by publication state.
export const getListBlogsWithState = async (
  blogState: "PENDING" | "APPROVED" | "REJECTED",
): Promise<IBlogItemData[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<IBlogItemData[]>(
      "/blog/admin/blogs",
      {
        params: { state: blogState },
      },
    );
    return response.data;
  } catch {
    throw new Error("Không thể lấy danh sách bài viết");
  }
};

// Fetch single blog post details by ID.
export const getBlogDetail = async (blogId: string): Promise<IBlogData> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<IBlogData>(
      `/blog/admin/${blogId}`,
    );
    return response.data;
  } catch {
    throw new Error("Không thể lấy thông tin chi tiết bài viết");
  }
};

// Check if a blog link slug is already taken.
export const checkDuplicateBlogLink = async (
  blogLink: string,
): Promise<boolean> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<boolean>(
      "/blog/is-duplicate-link-post",
      {
        params: { link_post: blogLink },
      },
    );
    return response.data;
  } catch {
    throw new Error("Không thể kiểm tra trùng lặp đường dẫn bài viết");
  }
};

// Update an existing blog post and optionally replace the banner image.
export const updateBlog = async (
  blogData: Partial<IBlogUpdateData>,
  fileImage?: File,
) => {
  try {
    const axiosClient = getAxiosClient();
    const formData = new FormData();
    if (fileImage) {
      formData.append("image", fileImage);
    }
    formData.append("blog_data", JSON.stringify(blogData));

    const response = await axiosClient.put(
      `/blog/${blogData.id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch {
    throw new Error("Lỗi khi cập nhật bài viết");
  }
};

// Delete a blog post by ID.
export const deleteBlog = async (blogId: string) => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.delete(`/blog/${blogId}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      throw new Error("Bài viết này hiện đang được sử dụng cho tiếp thị liên kết.");
    }
    throw new Error("Đã xảy ra lỗi. Vui lòng thử lại sau.");
  }
};

export const categories = [
  { value: "ALL", label: "Tất cả bài viết" },
  { value: "NEWS", label: "Tin tức" },
  { value: "INVESTMENT_INSIGHTS", label: "Góc nhìn đầu tư" },
  { value: "FOREIGN_INVESTMENT", label: "Đầu tư nước ngoài" },
  { value: "KNOWLEDGE_BASE", label: "Kiến thức cơ bản" },
  { value: "TUTORIALS", label: "Hướng dẫn" },
  { value: "CAREER", label: "Nghề nghiệp" },
];
