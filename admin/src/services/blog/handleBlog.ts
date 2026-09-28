/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  IBlogAIGenerateResponse,
  IParamsBlogTitlesAIGenerate,
  IBlogData,
  IBlogItemData,
  IBlogTags,
  IBlogUpdateData,
  IBlogDetailData,
  BlogCategory,
} from "../../types/Blog";
import { API_SERVICES } from "../../config/config";
import getAxiosClient from "../../lib/axios/axiosClient";

export const createBlogPost = async (blogData: IBlogData, fileImage: File) => {
  try {
    const axiosClient = getAxiosClient();
    const formData = new FormData();
    formData.append("image", fileImage);
    formData.append("blog_data", JSON.stringify(blogData));

    const response = await axiosClient.post(`${API_SERVICES}/blog`, formData);
    return response.data;
  } catch {
    throw new Error("Error creating blog:");
  }
};

export const getImageUrl = async (
  file: File,
  link_post: string,
): Promise<string> => {
  try {
    const axiosClient = getAxiosClient();
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosClient.post(
      `${API_SERVICES}/blog/image/${link_post}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error("Unable to get image url");
  }
};

export const getListBlogs = async (): Promise<IBlogItemData[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<IBlogItemData[]>(
      `${API_SERVICES}/blog/admin/blogs`,
    );

    return response.data;
  } catch {
    throw new Error("Unable to get list blog");
  }
};
export const getListBlogsWithState = async (
  blogState: "PENDING" | "APPROVED" | "REJECTED",
): Promise<IBlogItemData[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<IBlogItemData[]>(
      `${API_SERVICES}/blog/admin/blogs`,
      {
        params: { state: blogState }, // Pass query parameters directly using `params`
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get list blog");
  }
};

export const getBlogDetailInfo = async (
  blogId: string,
): Promise<IBlogItemData> => {
  try {
    const queryParams = new URLSearchParams();
    const axiosClient = getAxiosClient();

    const response = await axiosClient.get<IBlogItemData>(
      `${API_SERVICES}/blog/${blogId}/`,
      {
        params: queryParams,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get blog detail info");
  }
};

export const getBlogDetail = async (
  blogId: string,
): Promise<IBlogDetailData> => {
  try {
    const axiosClient = getAxiosClient();

    const response = await axiosClient.get<IBlogDetailData>(
      `${API_SERVICES}/blog/admin/${blogId}`,
    );
    return response.data;
  } catch {
    throw new Error("Unable to get blog detail");
  }
};

export const checkDuplicateBlogLink = async (
  blogLink: string,
): Promise<boolean> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<boolean>(
      `${API_SERVICES}/blog/is-duplicate-link-post`,
      {
        params: { link_post: blogLink },
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to check duplicate blog link");
  }
};

export const updateBlog = async (
  blogData: Partial<IBlogUpdateData>,
  fileImage?: File,
) => {
  try {
    console.log("Updating blog with data:", blogData);
    const axiosClient = getAxiosClient();
    const formData = new FormData();
    if (fileImage) {
      formData.append("image", fileImage);
    }
    formData.append("blog_data", JSON.stringify(blogData));

    const response = await axiosClient.put(
      `${API_SERVICES}/blog/${blogData.id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  } catch {
    throw new Error("Error updating blog:");
  }
};

export const getListTags = async (): Promise<IBlogTags[]> => {
  return [
    {
      id: "001",
      title: "Business",
    },
    {
      id: "002",
      title: "Investment",
    },
    {
      id: "003",
      title: "Legal",
    },
    {
      id: "004",
      title: "Tax",
    },
  ];
};

export const deleteBlog = async (blogId: string) => {
  try {
    const queryParams = new URLSearchParams();

    const axiosClient = getAxiosClient();

    const response = await axiosClient.delete(
      `${API_SERVICES}/blog/${blogId}`,
      {
        params: queryParams,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      throw new Error("This blog is currently in use for affiliates.");
    }

    throw new Error("Something went wrong. Please try again later.");
  }
};

export const generateBlogWithTitle = async (
  title: string,
): Promise<IBlogAIGenerateResponse> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<IBlogAIGenerateResponse>(
      `${API_SERVICES}/blog/ai-generate`,
      {
        title,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate blog with title");
  }
};

export const generateBlogTitles = async ({
  keyword,
  quantity,
  language,
}: IParamsBlogTitlesAIGenerate): Promise<string[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.get<string[]>(
      `${API_SERVICES}/blog/openai/ai-generate-list-title`,
      {
        params: { keyword, quantity, language },
      },
    );
    return response.data;
  } catch {
    throw new Error("Error generating blog titles");
  }
};
export const generateMarkdownBlogWithTitle = async (
  title: string,
  category: BlogCategory,
): Promise<IBlogAIGenerateResponse> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<IBlogAIGenerateResponse>(
      `${API_SERVICES}/blog/ai-generate-markdown`,
      {
        category,
        title,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate blog with title");
  }
};

export const categories = [
  { value: "ALL", label: "All Articles" },
  { value: "NEWS", label: "News" },
  { value: "INVESTMENT_INSIGHTS", label: "Investment Insights" },
  { value: "FOREIGN_INVESTMENT", label: "Foreign Investment" },
  { value: "KNOWLEDGE_BASE", label: "Knowledge Base" },
];
