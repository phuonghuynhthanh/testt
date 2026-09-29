/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaClock,
} from "react-icons/fa";
import type { BlogCategory } from "../../../../types/Blog";
import { generateMarkdownBlogWithTitle } from "../../../../services/blog/handleBlog";
import Modal from "../../../../shared/Popup/Modal";

interface BlogGenerateProps {
  blogTitles: string[];
  onClose: () => void;
  category: BlogCategory;
}

type BlogGenStatus = "waiting" | "pending" | "success" | "failed";

interface BlogGenItem {
  title: string;
  status: BlogGenStatus;
  result?: string; // blogId (success) or error message (failed)
}

const BlogGenerate: React.FC<BlogGenerateProps> = ({
  blogTitles,
  onClose,
  category,
}) => {
  const [genStates, setGenStates] = useState<BlogGenItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Initialize genStates only once when component mounts
    if (blogTitles.length > 0 && genStates.length === 0) {
      setGenStates(
        blogTitles.map((title) => ({
          title,
          status: "waiting" as BlogGenStatus,
        })),
      );
    }
  }, [blogTitles, genStates.length]);

  useEffect(() => {
    const generate = async () => {
      if (genStates.length === 0 || isGenerating) return;

      setIsGenerating(true);

      for (let i = 0; i < genStates.length; i++) {
        const currentTitle = genStates[i].title;

        // Set to pending
        setGenStates((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "pending" } : item,
          ),
        );

        try {
          const res = await generateMarkdownBlogWithTitle(
            currentTitle,
            category,
          );
          if (res.statusCode === 200 && res.id) {
            // Success
            setGenStates((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? { ...item, status: "success", result: res.id }
                  : item,
              ),
            );
          } else {
            // Backend returned error
            setGenStates((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      status: "failed",
                      result: res.message || "Unknown error",
                    }
                  : item,
              ),
            );
          }
        } catch (err: any) {
          setGenStates((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "failed",
                    result: err.message || "Unexpected error",
                  }
                : item,
            ),
          );
        }
      }

      setIsGenerating(false);
    };

    // Only start generating when we have states and haven't started yet
    if (
      genStates.length > 0 &&
      !isGenerating &&
      genStates.every((state) => state.status === "waiting")
    ) {
      generate();
    }
  }, [genStates.length, isGenerating]);

  const renderStatus = (status: BlogGenStatus, result?: string) => {
    switch (status) {
      case "waiting":
        return (
          <span className="flex items-center gap-2 text-gray-400">
            <FaClock className="animate-pulse" />
            Waiting
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-2 text-blue-500">
            <FaSpinner className="animate-spin" />
            Writing
          </span>
        );
      case "success":
        return (
          <button
            className="flex items-center gap-2 text-green-600 hover:underline"
            onClick={() =>
              window.open(
                `/blog/default/${result}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <FaCheckCircle />
            View detail
          </button>
        );
      case "failed":
        return (
          <button
            className="flex items-center gap-2 text-red-500 hover:underline"
            onClick={() => alert(result)}
          >
            <FaTimesCircle />
            View error
          </button>
        );
    }
  };

  return (
    <div className="fixed flex items-center justify-center h-screen z-20">
      <Modal isOpen={true} onClose={onClose}>
        <div className="p-4">
          <h2 className="text-xl text-primary-white font-semibold mb-2">
            Generating Blog Content
          </h2>
          <p className="text-gray-600 mb-4">
            AI is generating content for each blog title. You can close this
            window anytime.
          </p>

          <ul className="max-h-[400px] overflow-y-auto space-y-2 mb-4">
            {genStates.map((item, index) => (
              <li
                key={index}
                className="flex justify-between items-center bg-gray-50 border rounded-md px-4 py-2"
              >
                <span className="text-gray-800 break-all w-2/3">
                  {item.title}
                </span>
                <div className="w-1/3 text-right">
                  {renderStatus(item.status, item.result)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default BlogGenerate;
