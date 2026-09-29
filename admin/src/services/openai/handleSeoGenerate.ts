import getAxiosClient from "../../lib/axios/axiosClient";
import type { IDataSeoGenerate } from "../../types/OpenAi";

// Generate SEO keywords with the backend schema instead of browser-side providers.
export const getSeoKeywords = async (
  title: string,
  content: string,
): Promise<string[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string[]>(
      "/openai/seo-keywords",
      {
        blog_title: title,
        blog_content: content,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate SEO keywords");
  }
};

// Generate an SEO description with the backend schema.
export const getSeoDescription = async (
  title: string,
  content: string,
): Promise<string> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string>(
      "/openai/seo-description",
      {
        blog_title: title,
        blog_content: content,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate SEO description");
  }
};

// Request keywords and description together while keeping each backend call typed.
export const getSeoData = async (
  title: string,
  content: string,
): Promise<IDataSeoGenerate> => {
  try {
    const [keywords, description] = await Promise.all([
      getSeoKeywords(title, content),
      getSeoDescription(title, content),
    ]);

    return {
      listSeoKey: keywords,
      descript: description,
    };
  } catch {
    throw new Error("Unable to generate SEO data");
  }
};
