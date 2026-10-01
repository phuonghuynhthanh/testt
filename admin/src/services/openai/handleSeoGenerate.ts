import type { PostLanguage } from "../../types/Language";
import getAxiosClient from "../../lib/axios/axiosClient";
import type { IDataSeoGenerate } from "../../types/OpenAi";

// Generate SEO keywords with the backend schema instead of browser-side providers.
export const getSeoKeywords = async (
  title: string,
  content: string,
  language?: PostLanguage,
): Promise<string[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string[]>(
      "/openai/seo-keywords",
      {
        blog_title: title,
        blog_content: content,
        language,
      },
    );
    return response.data;
  } catch {
    throw new Error("Không thể tạo từ khóa SEO");
  }
};

// Generate an SEO description with the backend schema.
export const getSeoDescription = async (
  title: string,
  content: string,
  language?: PostLanguage,
): Promise<string> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string>(
      "/openai/seo-description",
      {
        blog_title: title,
        blog_content: content,
        language,
      },
    );
    return response.data;
  } catch {
    throw new Error("Không thể tạo mô tả SEO");
  }
};

// Request keywords and description together while keeping each backend call typed.
export const getSeoData = async (
  title: string,
  content: string,
  language?: PostLanguage,
): Promise<IDataSeoGenerate> => {
  try {
    const [keywords, description] = await Promise.all([
      getSeoKeywords(title, content, language),
      getSeoDescription(title, content, language),
    ]);

    return {
      listSeoKey: keywords,
      descript: description,
    };
  } catch {
    throw new Error("Không thể tạo dữ liệu SEO");
  }
};
