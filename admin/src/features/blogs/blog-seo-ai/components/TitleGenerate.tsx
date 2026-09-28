import { useState } from "react";
import { useBlog } from "../../../../context/BlogContext";
import { createUrl } from "../../../../utils/blogUtils";
import ButtonTheme from "../../../../shared/button/ButtonTheme";
import { generateTitleByKeywords } from "../../../../services/blog/handleBlogAI";
import ButtonCTA from "../../../../shared/button/ButtonCTA";
import { checkDuplicateBlogLink } from "../../../../services/blog/handleBlog";
import { toast } from "react-toastify";

interface Suggestion {
  title: string;
  description: string;
}

interface TitleGenerateProps {
  state: number;
}

const TitleGenerate = ({ state }: TitleGenerateProps) => {
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { state: blogState, update } = useBlog();

  const handleUpdateTitle = async () => {
    const url = createUrl(blogState.title);
    const is_duplicate = await checkDuplicateBlogLink(url);

    if (is_duplicate) {
      toast.warning(
        "The generated link already exists. Please modify the title.",
      );
      return;
    }

    update({
      title,
      link_post: url,
      seo: {
        ...blogState.seo,
        title,
        description: metaDescription,
        url,
      },
      currentStep: state + 1,
    });
  };

  const handleGenerateTitle = async () => {
    setIsLoading(true);
    try {
      const suggestions = await generateTitleByKeywords(
        blogState.seo.keywords || [],
        blogState.intent_keyword || [],
        blogState.language,
      );
      setSuggestions(suggestions);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
    setSelectedIndex(null);
  };

  const handleChooseSuggestion = (index: number) => {
    setSelectedIndex(index);

    const suggestion = suggestions[index];

    setTitle(suggestion.title);
    setMetaDescription(suggestion.description);
    update({
      title: suggestion.title,
      seo: {
        ...blogState.seo,
        title: suggestion.title,
        description: suggestion.description,
      },
    });
  };

  return (
    <div className="p-4 flex flex-col gap-6 bg-primary-black text-primary-white rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Create a title and description for the article.
        </h2>
        <ButtonCTA size="sm" onClick={handleGenerateTitle} disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate with AI"}
        </ButtonCTA>
      </div>

      {/* Title input */}
      <div className="flex flex-col gap-2">
        <label>Title (≤ 60 characters)</label>
        <input
          className="px-3 py-2 rounded bg-transparent border border-gray-600 text-primary-white"
          value={blogState.title}
          onChange={(e) =>
            update({
              title: e.target.value,
              seo: { ...blogState.seo, title: e.target.value },
            })
          }
          placeholder="Enter title..."
        />
      </div>

      {/* Meta description */}
      <div className="flex flex-col gap-2">
        <label>Meta description (≤ 160 characters)</label>
        <textarea
          className="px-3 py-2 rounded bg-transparent border border-gray-600 text-primary-white"
          value={blogState.seo.description}
          rows={4}
          onChange={(e) =>
            update({ seo: { ...blogState.seo, description: e.target.value } })
          }
          placeholder="Enter meta description..."
        />
      </div>

      {/* AI Generate */}

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="font-semibold">Suggestions from AI</p>

          {suggestions.map((suggestion, index) => (
            <label
              key={index}
              className="flex gap-3 p-4 rounded border border-gray-700 hover:border-green-500 cursor-pointer"
            >
              <input
                type="radio"
                checked={selectedIndex === index}
                onChange={() => handleChooseSuggestion(index)}
              />

              <div>
                <p className="text-green-400 font-medium">{suggestion.title}</p>
                <p className="opacity-80 text-sm mt-1">
                  {suggestion.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-between">
        <ButtonTheme
          variant="outline"
          onClick={() => update({ currentStep: blogState.currentStep - 1 })}
        >
          Back
        </ButtonTheme>
        <div className="flex gap-2">
          {state === 2 && (
            <ButtonTheme
              variant="outline"
              onClick={() => update({ currentStep: blogState.currentStep + 1 })}
            >
              Skip
            </ButtonTheme>
          )}
          <ButtonTheme
            variant="green"
            onClick={() => handleUpdateTitle()}
            disabled={
              state === 5 &&
              (title.trim() === "" || metaDescription.trim() === "")
            }
          >
            Next
          </ButtonTheme>
        </div>
      </div>
    </div>
  );
};

export default TitleGenerate;
