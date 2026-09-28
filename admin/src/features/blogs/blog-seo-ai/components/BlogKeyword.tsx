import { useState } from "react";
import { useBlog } from "../../../../context/BlogContext";
import { categories } from "../../../../services/blog/handleBlog";
import {
  generateIntentKeywords,
  searchLinkByKeywords,
} from "../../../../services/blog/handleBlogAI";

import InputField from "../../../../shared/input/InputField";
import SelectField from "../../../../shared/select/SelectField";
import ButtonTheme from "../../../../shared/button/ButtonTheme";
import TextareaField from "../../../../shared/input/TextareaField";
import type { ILinkReference } from "../../../../types/Blog";
import ButtonCTA from "../../../../shared/button/ButtonCTA";
import { RiGeminiFill } from "react-icons/ri";
import { toast } from "react-toastify";

const BlogKeyword = () => {
  const { state: blogState, update } = useBlog();

  const [loading, setLoading] = useState(false);

  const handleFindLinkReferences = async () => {
    if (!blogState.seo.keywords) return;

    try {
      setLoading(true);

      const links = await searchLinkByKeywords(
        blogState.seo.keywords.join(", "),
        blogState.intent_keyword || [],
        blogState.language,
      );

      let normalCount = 0;

      const filteredLinks = links.map((link: ILinkReference) => {
        if (link.tag === "NORMAL" && normalCount < 5) {
          normalCount++;
          return { ...link, is_selected: true };
        }

        return { ...link, is_selected: false };
      });

      update({ link_references: filteredLinks });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (link: ILinkReference) => {
    const selectedCount = blogState.link_references.filter(
      (link) => link.is_selected,
    ).length;

    let hitLimit = false;

    const updatedLinks = blogState.link_references.map((prevLink) => {
      if (prevLink.url === link.url) {
        if (prevLink.is_selected) {
          return { ...prevLink, is_selected: false };
        }

        if (selectedCount >= 5) {
          hitLimit = true;
          return prevLink;
        }

        return { ...prevLink, is_selected: true };
      }

      return prevLink;
    });

    if (hitLimit) {
      toast.warning("You can select up to 5 links only.");
    }

    update({ link_references: updatedLinks });
  };

  const handleGenerateIntentKeywords = async () => {
    if (blogState.seo.keywords?.length === 0) return;
    setLoading(true);
    try {
      const intents = await generateIntentKeywords(blogState.seo.keywords);

      console.log("intent", intents);

      update({ intent_keyword: intents });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    update({
      currentStep: blogState.currentStep + 1,
    });
  };

  return (
    <div className="p-4 flex flex-col gap-6 relative">
      {/* Header */}

      {/* Inputs */}
      <div className="flex flex-col lg:flex-row gap-4">
        <InputField
          label="Keyword"
          id="keyword"
          name="keyword"
          value={blogState.seo.keywords?.join(", ") || ""}
          handleChange={(e) =>
            update({
              seo: { ...blogState.seo, keywords: e.target.value.split(", ") },
            })
          }
          placeholder="Enter a keyword"
        />

        <SelectField
          label="Language"
          id="language"
          name="language"
          value={blogState.language || "english"}
          options={[
            { label: "English", value: "english" },
            { label: "Vietnamese", value: "vietnamese" },
          ]}
          onChange={(e) => update({ language: e.target.value })}
        />

        <SelectField
          label="Category"
          id="category"
          name="category"
          value={blogState.category}
          options={categories.filter((c) => c.value !== "ALL")}
          onChange={(e) => update({ category: e.target.value })}
        />

        <div className="flex items-end">
          <ButtonTheme
            variant="green"
            className="h-10"
            disabled={
              !blogState.seo.keywords || blogState.seo.keywords.length === 0
            }
            onClick={handleFindLinkReferences}
          >
            {loading ? "Loading..." : "Find link references"}
          </ButtonTheme>
        </div>
      </div>
      <div className="relative">
        <div className="w-full flex justify-end">
          <ButtonCTA
            size="sm"
            className="absolute top-20 right-3"
            onClick={handleGenerateIntentKeywords}
            disabled={!blogState.seo.keywords?.length}
          >
            {loading ? "Loading..." : "Generate by AI"}
            <RiGeminiFill />
          </ButtonCTA>
        </div>
        <TextareaField
          rows={10}
          label="Intent keyword (optional)"
          name="Intent_keyword"
          id="Intent_keyword"
          value={blogState.intent_keyword?.join("\n") || ""}
          placeholder={`Enter secondary keywords, one keyword per line\nor separate them with commas.`}
          handleChange={(e) =>
            update({
              intent_keyword: e.target.value.split(", "),
            })
          }
        />
      </div>

      {/* Link references section */}
      {blogState.link_references?.length ? (
        <div className="mt-4 flex flex-col gap-3 bg-primary-black border border-gray-700 rounded p-4">
          <p className="font-semibold text-primary-white mb-2">
            Link references (top sources)
          </p>

          <div className="flex flex-col gap-3">
            {blogState.link_references.map((link) => {
              const isNormal = link.tag === "NORMAL";

              return (
                <div
                  key={link.url}
                  className={`flex items-start gap-3 p-3 rounded  ${
                    link.is_selected
                      ? " bg-primary-black-medium"
                      : "border-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={link.is_selected}
                    onChange={() => toggleSelect(link)}
                    className="mt-1 cursor-pointer"
                  />

                  <div className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      className="text-green-400 underline"
                    >
                      {link.title}
                    </a>

                    {!isNormal && (
                      <span className="inline-block text-xs px-2 py-1 rounded  border border-red-500 text-primary-white w-fit">
                        {link.tag}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Continue */}
      <div className="flex w-full justify-end">
        <ButtonTheme
          variant="green"
          onClick={handleContinue}
          disabled={
            blogState.link_references && blogState.link_references?.length < 5
          }
        >
          Next
        </ButtonTheme>
      </div>
    </div>
  );
};

export default BlogKeyword;
