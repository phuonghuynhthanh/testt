import React from "react";
import { IoList } from "react-icons/io5";
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
  editMode?: boolean; // Disable interactions when in edit mode
}

const TableOfContent: React.FC<TableOfContentProps> = ({
  headings,
  isVietnamese,
  onScrollToHeading,
  editMode = false,
}) => {
  // Filter out level 1 and level 3 headings to match frontend
  const filteredHeadings = headings.filter(
    (heading) => heading.level !== 1 && heading.level !== 3,
  );

  if (filteredHeadings.length === 0) return null;

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    // If in edit mode, show notification and prevent scrolling
    if (editMode) {
      toast.info("Chuyển sang chế độ Xem trước để tiếp tục điều hướng mục lục.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (onScrollToHeading) {
      onScrollToHeading(id);
    } else {
      // Fallback to default behavior
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav aria-label="Table of contents" className="mb-6 xl:mb-8">
      <div className="bg-primary-black-medium rounded-lg border border-primary-white/20 shadow-sm">
        {/* Header */}
        <div className="flex items-center px-3 sm:px-4 py-2 sm:py-3 border-b border-primary-white/20 bg-primary-black-medium rounded-t-lg">
          <IoList className="text-primary-green-dark w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <h2 className="font-semibold text-base sm:text-lg text-primary-green-dark">
            {isVietnamese === false ? "Table of Contents" : "Mục lục"}
          </h2>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 h-[40vh] xl:h-[60vh] overflow-y-auto">
          <ul className="space-y-1 sm:space-y-2">
            {filteredHeadings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleScroll(e, heading.id)}
                  className={`
                    block py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-all duration-200
                    ${
                      heading.level === 2
                        ? "font-semibold text-xs sm:text-sm ml-0"
                        : heading.level === 3
                          ? "font-medium text-xs sm:text-sm ml-2 sm:ml-4"
                          : "font-normal text-xs ml-4 sm:ml-8"
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
