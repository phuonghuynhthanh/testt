// Extract the first top-level markdown heading for title synchronization.
export const extractH1FromMarkdown = (markdown: string): string => {
  if (!markdown) return "";

  // Match h1 heading: # followed by space and text
  const h1Regex = /^#\s+(.+)$/m;
  const match = markdown.match(h1Regex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return "";
};

// Fix escaped markdown markers that commonly break headings, emphasis, lists, quotes, and tables.
export const fixEscapedMarkdownSyntax = (markdown: string) => {
  const rules: Array<[RegExp, string]> = [
    [/^(\s*)\\(#{1,6}\s+)/gm, "$1$2"],
    [/^(\s*)\\([-*+]\s+)/gm, "$1$2"],
    [/^(\s*)\\(>\s+)/gm, "$1$2"],
    [/\\(?=\*{1,3})/g, ""],
    [/\\(?=\|)/g, ""],
    [/\\=/g, "="],
  ];

  return rules.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    markdown,
  );
};
