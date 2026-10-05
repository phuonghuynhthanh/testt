import React from "react";
import { List } from "@phosphor-icons/react";
import { toast } from "react-toastify";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentProps {
  headings: Heading[];
  isVisible?: boolean;
  isVietnamese?: boolean;
  toggle?: () => void;
  alwaysExpanded?: boolean;
  onScrollToHeading?: (id: string) => void;
  editMode?: boolean;
}

// Render navigational table of contents extracted from markdown headings.
const TableOfContent: React.FC<TableOfContentProps> = ({
  headings,
  isVietnamese,
  onScrollToHeading,
  editMode = false,
}) => {
  const filteredHeadings = headings.filter(
    (heading) => heading.level !== 1 && heading.level !== 3,
  );

  if (filteredHeadings.length === 0) return null;

  // Handle smooth scroll to heading or show edit mode notice.
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (editMode) {
      toast.info("Chuyển sang chế độ Xem trước để tiếp tục điều hướng mục lục.");
      return;
    }

    if (onScrollToHeading) {
      onScrollToHeading(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav aria-label="Table of contents" className="mb-6 xl:mb-8">
      <div className="bg-surface-card rounded-lg border border-surface-border">
        <div className="flex items-center px-3.5 py-2.5 border-b border-surface-border bg-surface-card rounded-t-lg">
          <List weight="light" className="text-primary-green w-4 h-4 mr-2" />
          <h2 className="font-semibold text-sm text-content-primary">
            {isVietnamese === false ? "Table of Contents" : "Mục lục"}
          </h2>
        </div>

        <div className="p-3 h-[40vh] xl:h-[60vh] overflow-y-auto">
          <ul className="space-y-1">
            {filteredHeadings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleScroll(e, heading.id)}
                  className={`
                    block py-1.5 px-2.5 rounded text-xs transition-colors
                    ${
                      heading.level === 2
                        ? "font-semibold ml-0"
                        : heading.level === 3
                          ? "font-medium ml-3"
                          : "font-normal ml-5"
                    }
                    ${
                      editMode
                        ? "cursor-not-allowed text-content-muted"
                        : "hover:bg-surface-elevated hover:text-content-primary text-content-secondary cursor-pointer"
                    }
                  `}
                  style={{
                    marginLeft:
                      heading.level > 3 ? (heading.level - 1) * 8 : undefined,
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default TableOfContent;
