import getAxiosClient from "../../lib/axios/axiosClient";
import type { ICrawledData } from "../../types/Blog";
import {
  aiGenerateBlogWithoutTitle,
  aiGenerateBlogWithTitle,
  aiGenerateEditContent,
  aiGenerateIntentKeywords,
  aiGenerateOutlineByKeywords,
  aiGenerateOutlineByTileAndTile,
  handleAiGenerateTitle,
} from "../gemini/handleGenerate";

export const generateTitleByKeywords = async (
  keywords: string[],
  intents: string[],
  language: string,
) => {
  // const axiosClient = getAxiosClient();
  const response = await handleAiGenerateTitle(keywords, intents, language);
  return response;
};

export const generateOutline = async (
  keywords: string[],
  title: string,
  language: string,
  crawData: ICrawledData[],
) => {
  if (title.trim() === "") {
    const response = await aiGenerateOutlineByKeywords(
      keywords,
      language,
      crawData,
    );
    return response;
  }
  const response = await aiGenerateOutlineByTileAndTile(
    keywords,
    title,
    language,
    crawData,
  );
  return response;
};

// Search reference links through the backend's authenticated classifier route.
export const searchLinkByKeywords = async (
  keyword: string,
  keywords: string[],
  language: string,
  max_results: number = 10,
  exclude_ads: boolean = true,
  exclude_spam: boolean = true,
) => {
  const axiosClient = getAxiosClient();
  try {
    const response = await axiosClient.post(
      "/blog/search-references",
      {
        keyword,
        keywords: keywords.length > 0 ? keywords : null,
        language,
        max_results,
        exclude_ads,
        exclude_spam,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error searching links:", error);
  }
};

// Fetch article content through the backend rather than the browser.
export const crawlDataContent = async (url: string) => {
  const axiosClient = getAxiosClient();
  try {
    const response = await axiosClient.post(
      "/blog/fetch-content",
      {
        url,
        include_metadata: true,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error crawling data content:", error);
  }
};

export const generateBlog = async (
  keywords: string[],
  outline: string[],
  title: string,
  language: string,
) => {
  if (title.trim() === "") {
    const response = await aiGenerateBlogWithoutTitle(
      keywords,
      outline,
      language,
    );
    return response;
  }
  const response = await aiGenerateBlogWithTitle(
    keywords,
    title,
    outline,
    language,
  );
  return response;
};

export const editPartContent = async (content: string, user_prompt: string) => {
  const response = await aiGenerateEditContent(content, user_prompt);
  return response;
};

export const generateIntentKeywords = async (keywords: string[]) => {
  const response = await aiGenerateIntentKeywords(keywords);
  return response;
};
