// Remove prose punctuation while preserving balanced brackets in a clickable URL.
export const trimLinkedInPreviewUrl = (value: string): string => {
  let url = value.replace(/[.,!?;:]+$/, "");
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  // Trim only unmatched closing brackets added by surrounding prose.
  while (url && pairs[url.at(-1)!]) {
    const closing = url.at(-1)!;
    const opening = pairs[closing];
    if (url.split(closing).length <= url.split(opening).length) break;
    url = url.slice(0, -1).replace(/[.,!?;:]+$/, "");
  }
  return url;
};
