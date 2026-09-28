import React from "react";

interface ButtonMarkdownCustomProps {
  href?: string;
  children: React.ReactNode;
  colabLink?: string;
}

const BUTTON_PREFIX = "btn-";

// Render course markdown links and special button markers in admin preview.
const ButtonMarkdownCustom: React.FC<ButtonMarkdownCustomProps> = ({
  href,
  children,
  colabLink,
}) => {
  const action = href?.startsWith(BUTTON_PREFIX)
    ? href.replace(BUTTON_PREFIX, "")
    : null;

  // Open target action links used in course markdown content.
  const handleAction = () => {
    if (action === "colab" && colabLink) {
      window.open(colabLink, "_blank", "noopener,noreferrer");
      return;
    }

    if (href && !action) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  if (!action) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="py-0.5 text-[#00be73] underline decoration-[#00be73]/40 underline-offset-2 transition-all duration-150 hover:decoration-[#00be73]"
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAction}
      className="rounded-lg bg-[#00be73] px-4 py-2 font-medium text-black transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
};

export default ButtonMarkdownCustom;
