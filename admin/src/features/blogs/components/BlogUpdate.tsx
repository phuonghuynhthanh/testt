import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { IoIosSave } from "react-icons/io";
import { toast } from "react-toastify";

import type {
  IBlogData,
  IBlogUpdateData,
  IEditorData,
} from "../../../types/Blog";
import type { IDataSeoGenerate } from "../../../types/OpenAi";
import {
  checkDuplicateBlogLink,
  getBlogDetail,
  updateBlog,
} from "../../../services/blog/handleBlog";
import {
  extractH1FromMarkdown,
  fixEscapedMarkdownSyntax,
} from "../../../utils/markdown";
import { createUrl } from "../../../utils/blogUtils";
import BlogPreviewDemo from "./BlogPreviewDemo";
import {
  generateBannerWithOpenRouterOptions,
  type ImageAspectRatio,
  type ImageQuality,
  type ImageSize,
} from "../../../services/openrouter/handleImageGenerate";
import { buildBlogBannerPrompt } from "../../../utils/blogImagePrompt";
import BlogBasicInfoForm from "./BlogBasicInfoForm";
import BlogSeoForm from "./BlogSeoForm";

const INIT_BLOG_DATA: IBlogData = {
  id: "",
  tag: "",
  title: "",
  banner_url: "",
  link_post: "",
  category: "",
  state: "PENDING",
  seo: {
    title: "",
    description: "",
    url: "",
    keywords: [],
    author: "",
    published_time: "",
    modified_time: "",
    banner_url: "",
  },
  content: "",
  created_at: "",
  modified_at: "",
};

// Coordinate blog update data loading, local editing state, and save actions.
const BlogUpdate = () => {
  const queryClient = useQueryClient();
  const { blog_id: blogId } = useParams<{
    blog_id: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [storedLinkBlog, setStoredLinkBlog] = useState<string>("");
  const [content, setContent] = useState<IEditorData>({ title: "", body: "" });
  const [isOpenGenerate, setIsOpenGenerate] = useState(false);
  const [blogData, setBlogData] = useState<IBlogData>(INIT_BLOG_DATA);
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [openEditBlogContent, setopenEditBlogContent] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [blogContent, setBlogContent] = useState<string>("");
  const [isGeneratingBanner, setIsGeneratingBanner] = useState<boolean>(false);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [imageAspectRatio, setImageAspectRatio] =
    useState<ImageAspectRatio>("16:9");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [imageQuality, setImageQuality] = useState<ImageQuality>("low");
  const [dataSeoGenerate, setDataSeoGenerate] = useState<IDataSeoGenerate>({
    listSeoKey: [],
    descript: "",
  });

  const { data: blogDetail } = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId as string),
    enabled: !!blogId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Toggle the markdown preview/editor overlay.
  const handleClickEditBlogContent = () => {
    setopenEditBlogContent(!openEditBlogContent);
  };

  // Close the markdown preview/editor overlay.
  const closeEditBlogContent = () => {
    setopenEditBlogContent(false);
  };

  // Normalize escaped markdown syntax and keep the fixed content editable before saving.
  const handleFixMarkdownSyntax = () => {
    const fixedContent = fixEscapedMarkdownSyntax(blogContent);

    if (fixedContent === blogContent) {
      toast.info("No escaped markdown syntax found.");
      return;
    }

    handleContentChange(fixedContent);
    toast.success(
      "Markdown syntax fixed. Please review the preview before saving.",
    );
  };

  // Sync markdown content and use the first h1 as the blog title when present.
  const handleContentChange = (newContent: string) => {
    setBlogContent(newContent);
    const h1Title = extractH1FromMarkdown(newContent);
    if (h1Title) {
      setBlogData((prevData) => ({
        ...prevData,
        title: h1Title,
      }));
    }
  };

  // Update either top-level blog fields or nested SEO fields from form inputs.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBlogData((prevData) => {
      if (name.startsWith("seo.")) {
        const seoKey = name.split(".")[1];
        return {
          ...prevData,
          seo: { ...prevData.seo, [seoKey]: value },
        };
      }
      return { ...prevData, [name]: value };
    });
  };

  // Add comma-separated SEO keywords while preserving existing unique keywords.
  const handleAddKeyword = () => {
    const newKeywords = keywordInput
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw !== "");
    setBlogData((prevData) => {
      const uniqueKeywords = [
        ...new Set([...prevData.seo.keywords, ...newKeywords]),
      ];
      return {
        ...prevData,
        seo: {
          ...prevData.seo,
          keywords: uniqueKeywords,
        },
      };
    });
    setKeywordInput("");
  };

  // Remove a keyword from the SEO keyword list by index.
  const handleDeleteKeyword = (index: number) => {
    setBlogData((prevData) => {
      const updatedKeywords = prevData.seo.keywords.filter(
        (_, i) => i !== index,
      );
      return {
        ...prevData,
        seo: { ...prevData.seo, keywords: updatedKeywords },
      };
    });
  };

  // Build an update payload, validate slug uniqueness, and persist the blog.
  const handleUpdate = async () => {
    const toastId = toast.loading("Updating blog...");
    try {
      setIsLoading(true);

      const contentData = blogContent;
      const splitData = {
        title: blogData.title,
        body: contentData,
      };
      const linkBlogPost = createUrl(splitData.title);

      const blogUpdateData: Partial<IBlogUpdateData> = {
        id: blogData.id,
        tag: blogData.tag,
        title: splitData.title,
        banner_url: blogData.banner_url,
        link_post: linkBlogPost,
        category: blogData.category,
        state: "PENDING",
        seo: {
          title: blogData.seo.title,
          description: blogData.seo.description,
          url: blogData.seo.url,
          keywords: blogData.seo.keywords,
          author: blogData.seo.author,
          banner_url: blogData.banner_url,
        },
        content: splitData.body,
        created_at: blogData.created_at,
        modified_at: blogData.modified_at,
      };
      if (linkBlogPost !== storedLinkBlog) {
        const isDuplicate = await checkDuplicateBlogLink(linkBlogPost);
        if (isDuplicate) {
          alert("This title is already taken. Please choose a different one.");
          setIsLoading(false);
          return;
        }
      }
      await updateBlog(blogUpdateData, bannerImage as File);
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["blogs", "approved"] });

      toast.success("Update successful.");
    } catch {
      toast.error("Something went wrong. Please try again later.");
    } finally {
      toast.dismiss(toastId);
      setIsLoading(false);
    }
  };

  // Open SEO generation using the current title and markdown content.
  const handleGenerateSEO = () => {
    const splitData = { title: blogData.title, body: blogContent };
    setContent(splitData);
    setIsOpenGenerate(true);
  };

  // Generate a blog banner image from the current blog metadata and image options.
  const handleGenerateBanner = async () => {
    const prompt = buildBlogBannerPrompt({
      title: blogData.title,
      category: blogData.category,
      tag: blogData.tag,
      seoKeywords: blogData.seo.keywords,
      seoDescription: blogData.seo.description,
      aspectRatio: imageAspectRatio,
      customPrompt: imagePrompt,
    });

    const toastId = toast.loading("Generating banner with OpenRouter...");
    setIsGeneratingBanner(true);
    try {
      const file = await generateBannerWithOpenRouterOptions(prompt, {
        aspectRatio: imageAspectRatio,
        imageSize,
        quality: imageQuality,
      });
      setBannerImage(file);
      toast.update(toastId, {
        render: "Generated banner is ready.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      toast.update(toastId, {
        render: `${error}`,
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  useEffect(() => {
    if (dataSeoGenerate.listSeoKey.length > 0) {
      setBlogData((prevData) => {
        const uniqueKeywords = [
          ...new Set([...prevData.seo.keywords, ...dataSeoGenerate.listSeoKey]),
        ];
        return {
          ...prevData,
          seo: {
            ...prevData.seo,
            keywords: uniqueKeywords,
            description: dataSeoGenerate.descript,
          },
        };
      });
    }
  }, [dataSeoGenerate]);

  useEffect(() => {
    if (!blogDetail) return;

    setBlogData((prevData) => {
      const uniqueKeywords = [
        ...new Set([...prevData.seo.keywords, ...blogDetail.seo.keywords]),
      ];
      return {
        ...prevData,
        seo: {
          ...prevData.seo,
          keywords: uniqueKeywords,
        },
      };
    });
  }, [blogDetail]);

  useEffect(() => {
    // Warn users before closing the tab with unsaved local edits.
    const handleBeforeUnload = (event: {
      preventDefault: () => void;
      returnValue: string;
    }) => {
      event.preventDefault();
      event.returnValue =
        "All unsaved changes will be lost. Are you sure you want to leave?";
      return "All unsaved changes will be lost. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (blogDetail) {
      setStoredLinkBlog(blogDetail.link_post);
      setBlogData((prev) => ({
        ...prev,
        id: blogDetail.id,
        tag: blogDetail.tag,
        title: blogDetail.title,
        banner_url: blogDetail.banner_url,
        link_post: blogDetail.link_post,
        category: blogDetail.category,
        state: blogDetail.state,
        seo: blogDetail.seo,
        content: blogDetail.content,
        created_at: blogDetail.created_at,
        modified_at: blogDetail.modified_at,
      }));
      setBlogContent(blogDetail.content);

      // Sync title from h1 in content if h1 exists.
      const h1Title = extractH1FromMarkdown(blogDetail.content);
      if (h1Title) {
        setBlogData((prev) => ({
          ...prev,
          title: h1Title,
        }));
      }
    }
  }, [blogDetail]);

  return (
    <div className="p-6 text-gray-th2">
      {openEditBlogContent && (
        <BlogPreviewDemo
          tag={blogData.tag}
          title={blogData.title}
          banner={blogData.banner_url}
          content={blogContent}
          onClose={closeEditBlogContent}
          onChange={handleContentChange}
          onSave={handleUpdate}
          isLoading={isLoading}
        />
      )}

      <h1 className="text-2xl font-bold text-primary-white">Blog Detail</h1>

      <BlogBasicInfoForm
        blogData={blogData}
        bannerImage={bannerImage}
        imagePrompt={imagePrompt}
        imageAspectRatio={imageAspectRatio}
        imageSize={imageSize}
        imageQuality={imageQuality}
        isGeneratingBanner={isGeneratingBanner}
        setBannerImage={setBannerImage}
        onFieldChange={handleChange}
        onPromptChange={setImagePrompt}
        onAspectRatioChange={setImageAspectRatio}
        onSizeChange={setImageSize}
        onQualityChange={setImageQuality}
        onGenerateBanner={handleGenerateBanner}
      />
      <BlogSeoForm
        blogData={blogData}
        content={content}
        isOpenGenerate={isOpenGenerate}
        keywordInput={keywordInput}
        onFieldChange={handleChange}
        onGenerateSEO={handleGenerateSEO}
        onCloseGenerate={() => setIsOpenGenerate(false)}
        setDataSeoGenerate={setDataSeoGenerate}
        setKeywordInput={setKeywordInput}
        onAddKeyword={handleAddKeyword}
        onDeleteKeyword={handleDeleteKeyword}
      />

      <div className="flex gap-6 items-end my-10">
        <h4 className="text-xl text-primary-white">Blog Content</h4>
        <span
          className="hover:cursor-pointer underline-offset-4 hover:underline text-blue-500"
          onClick={handleClickEditBlogContent}
        >
          {!openEditBlogContent ? "Edit Blog Content" : "Hidden Blog Content"}
        </span>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          onClick={handleFixMarkdownSyntax}
        >
          Fix Markdown Syntax
        </button>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          className="flex items-center gap-1 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={handleUpdate}
          disabled={isLoading}
        >
          <span>Save Changes</span> <IoIosSave className="inline text-xl" />
        </button>
      </div>
    </div>
  );
};

export default BlogUpdate;
