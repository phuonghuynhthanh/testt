import React from "react";

export interface ParsedItem {
  title: string;
  description: string;
}

type MarkdownNode = {
  type?: string;
  value?: string;
  data?: Record<string, unknown>;
  children?: MarkdownNode[];
};

const ANNOTATION_MAP: Record<string, string> = {
  "component:list-dropdown": "component-list-dropdown",
  "component:step-list": "component-step-list",
  "component:callout": "component-callout",
  "component:list-card": "component-list-card",
  "component:list-flip": "component-list-flip",
};

const COMMENT_RE = /^<!--\s*(?:(list:\w+)|(component:[\w-]+))\s*-->$/;
const FENCE_RE = /^(```|~~~)\s*(\w+)?\s*$/;

// Remove markdown bold wrappers to normalize title parsing.
function stripBold(text: string): string {
  return text.replace(/\*\*/g, "").trim();
}

// Escape cell content before converting tab-separated text to a GFM table.
function escapeTableCell(value: string): string {
  return value.trim().replace(/\|/g, "\\|");
}

// Detect whether a tab-separated line can be safely promoted to a table row.
function getTabSeparatedCells(line: string): string[] | null {
  if (!line.includes("\t")) return null;

  const cells = line.split("\t").map((cell) => cell.trim());
  if (cells.length < 2 || cells.some((cell) => !cell)) return null;

  return cells;
}

// Convert consecutive tab-separated rows into a markdown table.
function convertTsvBlockToTable(lines: string[], startIndex: number) {
  const rows: string[][] = [];
  let currentIndex = startIndex;
  let expectedColumnCount: number | null = null;

  while (currentIndex < lines.length) {
    const cells = getTabSeparatedCells(lines[currentIndex]);
    if (!cells) break;

    expectedColumnCount ??= cells.length;
    if (cells.length !== expectedColumnCount) break;

    rows.push(cells);
    currentIndex += 1;
  }

  if (rows.length < 2) return null;

  const tableLines = rows.map(
    (row) => `| ${row.map(escapeTableCell).join(" | ")} |`,
  );
  const separator = `| ${rows[0].map(() => "---").join(" | ")} |`;

  return {
    nextIndex: currentIndex,
    lines: [tableLines[0], separator, ...tableLines.slice(1), ""],
  };
}

// Close common one-line code fences that would otherwise swallow the rest of a lesson.
function closeSingleLineTextFence(lines: string[], startIndex: number) {
  const fenceMarker = lines[startIndex].match(FENCE_RE)?.[1] ?? "```";
  const firstContentIndex = startIndex + 1;
  if (firstContentIndex >= lines.length || !lines[firstContentIndex].trim())
    return null;

  const secondContentIndex = firstContentIndex + 1;
  if (
    secondContentIndex < lines.length &&
    lines[secondContentIndex].trim() &&
    !FENCE_RE.test(lines[secondContentIndex])
  )
    return null;

  let lookAheadIndex = secondContentIndex;
  while (lookAheadIndex < lines.length && !lines[lookAheadIndex].trim()) {
    lookAheadIndex += 1;
  }

  const nextMeaningfulLine = lines[lookAheadIndex]?.trim() ?? "";
  const looksLikeMarkdownContinues =
    !nextMeaningfulLine ||
    nextMeaningfulLine.startsWith("#") ||
    nextMeaningfulLine.startsWith("* ") ||
    nextMeaningfulLine.startsWith("- ") ||
    nextMeaningfulLine.startsWith(">") ||
    nextMeaningfulLine.endsWith(":");

  if (!looksLikeMarkdownContinues) return null;

  return {
    nextIndex: secondContentIndex,
    lines: [lines[startIndex], lines[firstContentIndex], fenceMarker],
  };
}

// Normalize loose lesson markdown so the preview renders the same visible content as raw mode.
export function normalizeCourseMarkdownForPreview(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const normalizedLines: string[] = [];
  let index = 0;
  let activeFence: string | null = null;

  while (index < lines.length) {
    const line = lines[index];
    const fenceMatch = line.match(FENCE_RE);

    if (fenceMatch) {
      if (activeFence) {
        activeFence = null;
        normalizedLines.push(line);
        index += 1;
        continue;
      }

      const fixedFence = closeSingleLineTextFence(lines, index);
      if (fixedFence) {
        normalizedLines.push(...fixedFence.lines);
        index = fixedFence.nextIndex;
        continue;
      }

      activeFence = fenceMatch[1];
      normalizedLines.push(line);
      index += 1;
      continue;
    }

    if (!activeFence) {
      const table = convertTsvBlockToTable(lines, index);
      if (table) {
        normalizedLines.push(...table.lines);
        index = table.nextIndex;
        continue;
      }
    }

    normalizedLines.push(line);
    index += 1;
  }

  if (activeFence) normalizedLines.push(activeFence);

  return normalizedLines.join("\n");
}

// Convert markdown list content to title + description pairs.
export function parseListItem(raw: string): ParsedItem {
  const text = raw.trim();

  const boldMatch = text.match(/^\*\*(.+?)\*\*:?\s*(.*)/s);
  if (boldMatch) {
    return {
      title: stripBold(boldMatch[1]).replace(/:$/, "").trim(),
      description: boldMatch[2].trim(),
    };
  }

  const colonIndex = text.indexOf(":");
  if (colonIndex !== -1 && colonIndex <= 80) {
    const before = stripBold(text.slice(0, colonIndex));
    const after = text.slice(colonIndex + 1).trim();
    if (before && after) return { title: before, description: after };
  }

  const dashMatch = text.match(/^(.{1,60}?)\s+[-\u2013\u2014]\s+(.*)/s);
  if (dashMatch)
    return { title: stripBold(dashMatch[1]), description: dashMatch[2].trim() };

  return { title: stripBold(text), description: "" };
}

// Flatten React nodes into plain text for list item parsing.
export function nodeToText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return nodeToText(element.props.children);
  }
  return "";
}

// Build a stable slug id for markdown heading anchors.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Recursively walk mdast tree nodes and run a callback.
function walkTree(
  node: MarkdownNode,
  callback: (current: MarkdownNode, parent: MarkdownNode | null) => void,
  parent: MarkdownNode | null = null,
) {
  callback(node, parent);
  if (!node.children || node.children.length === 0) return;
  node.children.forEach((child) => walkTree(child, callback, node));
}

// Attach list/callout annotation classNames to the immediate following markdown block.
export const remarkListAnnotations = () => {
  return (tree: MarkdownNode) => {
    walkTree(tree, (current, parent) => {
      if (
        !parent ||
        current.type !== "html" ||
        typeof current.value !== "string"
      )
        return;
      const match = current.value.trim().match(COMMENT_RE);
      if (!match) return;

      const annotationType = match[1] || match[2];
      const className = ANNOTATION_MAP[annotationType];
      if (!className || !parent.children) return;

      const index = parent.children.indexOf(current);
      if (index < 0) return;

      let nextIndex = index + 1;
      while (nextIndex < parent.children.length) {
        const sibling = parent.children[nextIndex];
        if (sibling.type === "html" && !(sibling.value || "").trim()) {
          nextIndex += 1;
          continue;
        }
        break;
      }

      const nextNode = parent.children[nextIndex];
      if (!nextNode) return;

      // Map callout marker to the next paragraph node.
      if (annotationType === "component:callout") {
        if (nextNode.type !== "paragraph") return;
        nextNode.data = nextNode.data || {};
        const hProperties =
          (nextNode.data.hProperties as Record<string, unknown> | undefined) ||
          {};
        hProperties.className = "component-callout-paragraph";
        nextNode.data.hProperties = hProperties;
        current.value = "";
        return;
      }

      // Map list-style markers to the next list node.
      if (nextNode.type !== "list") return;
      nextNode.data = nextNode.data || {};
      const hProperties =
        (nextNode.data.hProperties as Record<string, unknown> | undefined) ||
        {};
      hProperties.className = className;
      nextNode.data.hProperties = hProperties;
      current.value = "";
    });
  };
};
