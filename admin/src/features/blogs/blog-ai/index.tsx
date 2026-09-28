import { IoMdAddCircle } from "react-icons/io";
import { useState } from "react";
import { FaRegWindowClose } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { toast } from "react-toastify";
import type { BlogCategory } from "../../../types/Blog";
import {
  categories,
  generateBlogTitles,
} from "../../../services/blog/handleBlog";
import LoadingItem from "../../../shared/loading/LoadingItem";
import InputField from "../../../shared/input/InputField";
import SelectField from "../../../shared/select/SelectField";
import BlogGenerate from "./components/BlogGenerate";

// Render the legacy AI title and blog generation workflow.
const AgentCreateBlog = () => {
  const [blogTitles, setBlogTitles] = useState<string[]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const [language, setLanguage] = useState<string>("english");
  const [numTitles, setNumTitles] = useState<number>(5);
  const [category, setCategory] = useState<BlogCategory>("INVESTMENT_INSIGHTS");
  const [isOpenPopupBlogGenerate, setIsOpenPopupBlogGenerate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Request AI-generated titles for the selected topic and language.
  const handleGenerateTitles = async () => {
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }
    if (numTitles < 5) {
      toast.error("Number of titles must be at least 5");
      return;
    }
    // Call the API to generate titles
    setIsLoading(true);
    try {
      const titles = await generateBlogTitles({
        keyword,
        quantity: numTitles,
        language,
      });

      if (!titles || titles.length === 0) {
        toast.error("No titles generated from AI");
        return;
      }
      console.log("Generated titles:", titles);
      setBlogTitles(titles);
    } catch {
      toast.error("Error generating titles from AI");
    } finally {
      setIsLoading(false);
    }
  };
  // Remove a generated title before starting content generation.
  const handleDeleteTitle = (index: number) => {
    setBlogTitles((prev) => prev.filter((_, i) => i !== index));
  };

  // Open the content generator only when at least one title is available.
  const handleGenerateBlogContent = () => {
    if (blogTitles.length === 0) {
      toast.error("Please generate at least one title first");
      return;
    }
    setIsOpenPopupBlogGenerate(true);
  };

  // Close the generator and reset its title selection.
  const handleClosePopupBlogGenerate = () => {
    setIsOpenPopupBlogGenerate(false);
    setBlogTitles([]);
  };

  return (
    <div className="p-4 flex flex-col gap-6 relative">
      {isLoading && <LoadingItem />}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-white">
          Create Blog Titles
        </h1>
        <p className="text-primary-white/80 text-sm">
          Input a keyword, choose language, and number of titles. AI will
          generate blog titles for you.
        </p>
        <hr className="mt-2" />
      </div>

      {/* Inputs Section */}
      <div className="flex flex-col gap-4">
        {/* All fields in one row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Keyword */}
          <InputField
            label="Keyword"
            id="keyword"
            name="keyword"
            value={keyword}
            handleChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter a keyword (e.g. ReactJS)"
          />

          {/* Language */}
          <SelectField
            label="Language"
            id="language"
            name="language"
            value={language}
            options={[
              { label: "English", value: "english" },
              { label: "Vietnamese", value: "vietnamese" },
            ]}
            onChange={(e) => setLanguage(e.target.value)}
          />

          {/* Number of Titles */}
          <InputField
            label="Number of Titles"
            id="numTitles"
            name="numTitles"
            value={numTitles.toString()}
            handleChange={(e) =>
              setNumTitles(parseInt(e.target.value, 10) || 5)
            }
            placeholder="5"
          />

          {/* Category */}
          <SelectField
            label="Category"
            id="category"
            name="category"
            value={category}
            options={categories.filter((cat) => cat.value !== "ALL")}
            onChange={(e) => setCategory(e.target.value as BlogCategory)}
          />
        </div>

        <button
          onClick={handleGenerateTitles}
          disabled={isLoading}
          className={`w-max self-end flex items-center gap-2 px-4 py-2 rounded-md transition ${
            isLoading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <IoMdAddCircle className="text-lg" />
          Generate Titles from AI
        </button>
      </div>

      {/* Display Titles */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-primary-white">
          Blog Title List
        </h2>
        <hr className="my-2" />

        {blogTitles.length === 0 ? (
          <p className="text-primary-white/80 italic">
            No titles generated yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {blogTitles.map((title, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm hover:bg-gray-100"
              >
                <span className="text-black text-lg break-all">{title}</span>
                <button
                  onClick={() => handleDeleteTitle(index)}
                  className="text-red-500 hover:text-red-600 transition"
                  aria-label="Delete title"
                >
                  <FaRegWindowClose />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="self-end px-3 py-2 text-lg text-white font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center gap-2"
          onClick={handleGenerateBlogContent}
        >
          Generate Blog Content with AI <BsStars className="inline" />
        </button>
      </div>

      {isOpenPopupBlogGenerate && (
        <BlogGenerate
          blogTitles={blogTitles}
          onClose={handleClosePopupBlogGenerate}
          category={category}
        />
      )}
    </div>
  );
};

export default AgentCreateBlog;
