import { API_SERVICES } from "../../config/config";
import getAxiosClient from "../../lib/axios/axiosClient";
import type { IDataSeoGenerate } from "../../types/OpenAi";

export const getSeoKeywords = async (
  title: string,
  content: string,
): Promise<string[]> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string[]>(
      `${API_SERVICES}/openai/seo-keywords`,
      {
        title,
        content,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate SEO keywords");
  }
};

export const getSeoDescription = async (
  title: string,
  content: string,
): Promise<string> => {
  try {
    const axiosClient = getAxiosClient();
    const response = await axiosClient.post<string>(
      `${API_SERVICES}/openai/seo-description`,
      {
        title,
        content,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to generate SEO description");
  }
};

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
