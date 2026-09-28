import { slugifyText } from "./markdownUtil";

export const createUrl = (title: string) => {
  return slugifyText(title);
};

export const parseIntentKeywords = (text: string): string[] => {
  return Array.from(
    new Set(
      text
        .split(/[\n,]/) // tách theo dấu phẩy HOẶC xuống dòng
        .map((k) => k.trim())
        .filter(Boolean),
    ),
  );
};
