import { useEffect, useRef, useState } from "react";
import ButtonTheme from "../../../../shared/button/ButtonTheme";
import TextareaField from "../../../../shared/input/TextareaField";
import { editPartContent } from "../../../../services/blog/handleBlogAI";

interface AIPopupProps {
  content: string;
  onClose: () => void;
  onChange: (markdown: string) => void;
}

export default function AIPopup({ onClose, content, onChange }: AIPopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = [
    "Improve writing",
    "Make shorter",
    "Translate",
    "Simplify",
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleSuggestionClick(s: string) {
    setSelected(s);
    setValue(s);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    setSelected(null);
  }

  const handleApplyEdit = async () => {
    try {
      setIsLoading(true);
      const updatedContent = await editPartContent(content, value);
      onChange(updatedContent);
    } catch (error) {
      console.log(error);
    } finally {
      setValue("");
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={ref}
      className="
        absolute
        top-[64px] right-[12px]
        w-[380px]
        bg-primary-black-medium text-primary-white
        rounded-xl shadow-sm border
        p-4 z-[60]
        space-y-2
        shadow-white/10
      "
    >
      <h3 className="font-semibold mb-2 text-sm">Edit with AI</h3>

      <TextareaField
        value={value}
        label="Write your suggestion"
        rows={3}
        placeholder="How would you like to edit this content?"
        handleChange={handleChange}
      />

      <ButtonTheme variant="green" onClick={() => handleApplyEdit()}>
        {isLoading ? "Loading..." : "Apply"}
      </ButtonTheme>

      <hr className="my-3" />

      <div className="flex flex-wrap gap-2 text-xs">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className={`px-3 py-1 rounded-full border hover:bg-primary-black-light ${
              selected === s
                ? "bg-primary-black-medium border-primary-green"
                : ""
            }`}
            onClick={() => handleSuggestionClick(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
