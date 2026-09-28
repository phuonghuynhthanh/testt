import React from "react";
import { nodeToText, parseListItem } from "../../../utils/courseMarkdownUtils";

interface CardListProps {
  items: React.ReactNode[];
}

interface ParsedCardItem {
  title: React.ReactNode;
  description: React.ReactNode | null;
}

// Check whether a node is plain whitespace.
const isWhitespaceText = (node: React.ReactNode): boolean =>
  (typeof node === "string" || typeof node === "number") &&
  String(node).trim() === "";

// Extract direct children from a markdown list item element.
const getItemChildren = (item: React.ReactNode): React.ReactNode => {
  if (React.isValidElement(item)) {
    const element = item as React.ReactElement<{ children?: React.ReactNode }>;
    return element.props.children;
  }
  return item;
};

// Normalize markdown list item nodes and unwrap wrapping <p> nodes.
const normalizeItemChildren = (item: React.ReactNode): React.ReactNode[] => {
  let nodes = React.Children.toArray(getItemChildren(item)).filter(
    (node) => !isWhitespaceText(node),
  );

  if (nodes.length === 1 && React.isValidElement(nodes[0])) {
    const element = nodes[0] as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    if (
      typeof element.type === "string" &&
      element.type.toLowerCase() === "p"
    ) {
      nodes = React.Children.toArray(element.props.children).filter(
        (node) => !isWhitespaceText(node),
      );
    }
  }

  return nodes;
};

// Trim title/description delimiters from node collections.
const trimLeadingDelimiter = (nodes: React.ReactNode[]): React.ReactNode[] => {
  const next = [...nodes];
  while (next.length > 0) {
    const first = next[0];
    if (typeof first === "string" || typeof first === "number") {
      const text = String(first);
      const trimmed = text
        .replace(/^\s*[:\-\u2013\u2014]\s*/, "")
        .replace(/^\s+/, "");
      if (!trimmed) {
        next.shift();
        continue;
      }
      next[0] = trimmed;
    }
    break;
  }
  return next;
};

// Detect whether text starts with title-description delimiter.
const hasLeadingDelimiter = (node: React.ReactNode): boolean => {
  if (typeof node !== "string" && typeof node !== "number") return false;
  return /^\s*[:\-\u2013\u2014]\s*/.test(String(node));
};

// Parse rich markdown list item content into title and description.
const parseCardItem = (item: React.ReactNode): ParsedCardItem => {
  const children = normalizeItemChildren(item);

  if (children.length === 0) {
    return { title: "", description: null };
  }

  const first = children[0];
  const second = children[1];

  if (React.isValidElement(first) && hasLeadingDelimiter(second)) {
    const titleElement = first as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    const rest = trimLeadingDelimiter(children.slice(1));
    return {
      title: titleElement.props.children,
      description: rest.length > 0 ? <>{rest}</> : null,
    };
  }

  const titleNodes: React.ReactNode[] = [];
  const descriptionNodes: React.ReactNode[] = [];
  let didSplit = false;

  for (const node of children) {
    if (didSplit) {
      descriptionNodes.push(node);
      continue;
    }

    if (typeof node === "string" || typeof node === "number") {
      const text = String(node);
      const colonIndex = text.indexOf(":");
      if (colonIndex !== -1 && colonIndex <= 80) {
        const before = text.slice(0, colonIndex).trim();
        const after = text.slice(colonIndex + 1);
        if (before) {
          titleNodes.push(before);
          if (after) descriptionNodes.push(after);
          didSplit = true;
          continue;
        }
      }

      const dashMatch = text.match(
        /^(.{1,60}?)\s+[-\u2013\u2014]\s+([\s\S]*)$/,
      );
      if (dashMatch) {
        titleNodes.push(dashMatch[1].trim());
        if (dashMatch[2]) descriptionNodes.push(dashMatch[2]);
        didSplit = true;
        continue;
      }
    }

    titleNodes.push(node);
  }

  if (didSplit) {
    const trimmedDescription = trimLeadingDelimiter(descriptionNodes);
    return {
      title: <>{titleNodes}</>,
      description:
        trimmedDescription.length > 0 ? <>{trimmedDescription}</> : null,
    };
  }

  const hasRichNode = children.some((node) => React.isValidElement(node));
  if (hasRichNode) {
    return { title: <>{children}</>, description: null };
  }

  const { title, description } = parseListItem(nodeToText(item));
  return { title, description: description || null };
};

// Render list-card items as responsive card grid.
const CardList: React.FC<CardListProps> = ({ items }) => {
  const columnClass = items.length % 2 === 0 ? "grid-cols-2" : "grid-cols-3";

  return (
    <ul
      className={`my-4 grid ${columnClass} list-none gap-4 p-0 max-md:grid-cols-1`}
    >
      {items.map((item, index) => {
        const { title, description } = parseCardItem(item);
        return (
          <li
            key={index}
            className="flex flex-col rounded-xl border border-white/10 bg-[#1A1A1A] p-5 transition-all duration-200"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-white transition-colors sm:text-base">
                {title}
              </span>
            </div>
            {description && (
              <div className="text-sm leading-[1.7] text-white/55 sm:text-base">
                {description}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default CardList;
