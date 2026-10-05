import React from "react";
import { Sparkle, Warning } from "@phosphor-icons/react";
import type { PostLanguage } from "../../../types/Language";
import { LinkedInContentEditor } from "./LinkedInContentEditor";
import type { FactualReview, LinkedInLinkPlacement } from "../../../types/Publication";
import { PostLanguageSelect } from "../../../shared/ui/PostLanguageSelect";
import { SectionHeading } from "../../../shared/ui";

interface LinkedInWorkspaceCardProps {
  blogId: string;
  linkPlacement: LinkedInLinkPlacement;
  language: PostLanguage;
  content: string;
  onContentChange: (val: string) => void;
  isGeneratingDraft: boolean;
  onGenerateDraft: () => void;
  showGenerateDraft?: boolean;
  generationLanguage: PostLanguage;
  onLanguageChange: (language: PostLanguage) => void;
  showLanguageSelect: boolean;
  media: React.ComponentProps<typeof LinkedInContentEditor>["media"];
  factCheck: FactualReview;
  factCheckAcknowledged: boolean;
  onAcknowledgeFactCheck: (val: boolean) => void;
  isPublished: boolean;
}

// Render the editable LinkedIn content block and the fact-check acknowledgement for a blog adaptation.
export const LinkedInWorkspaceCard: React.FC<LinkedInWorkspaceCardProps> = ({
  content,
  blogId,
  linkPlacement,
  language,
  onContentChange,
  isGeneratingDraft,
  onGenerateDraft,
  showGenerateDraft = true,
  generationLanguage,
  onLanguageChange,
  showLanguageSelect,
  media,
  factCheck,
  factCheckAcknowledged,
  onAcknowledgeFactCheck,
  isPublished,
}) => {
  return (
    <>
      <div className="panel p-4 space-y-4">
        <SectionHeading title="2. Nội dung LinkedIn" description="Chủ đề bài đăng và văn bản xuất bản" />

        {showGenerateDraft && (
          <div className="flex flex-wrap items-end gap-3">
            {showLanguageSelect && !isPublished && (
              <PostLanguageSelect value={generationLanguage} onChange={onLanguageChange} disabled={isGeneratingDraft} />
            )}
            <button
              type="button"
              onClick={onGenerateDraft}
              disabled={isGeneratingDraft || isPublished}
              className="btn btn-ai"
            >
              <Sparkle size={16} weight="light" className={isGeneratingDraft ? "animate-spin" : ""} />
              {isGeneratingDraft ? "Đang tạo bằng AI..." : content ? "Tạo lại bằng AI" : "Tạo bản nháp bằng AI"}
            </button>
          </div>
        )}

        <LinkedInContentEditor
          content={content}
          onChange={onContentChange}
          media={media}
          blogId={blogId}
          linkPlacement={linkPlacement}
          language={language}
          disabled={isPublished}
        />
      </div>

      {factCheck.requiresHumanFactCheck && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Warning size={18} weight="light" className="text-amber-400" />
            Kiểm tra tính chính xác của nội dung
          </h3>
          {factCheck.factCheckNotes.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">
              {factCheck.factCheckNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-amber-200/90">
              Nội dung này cần được người quản trị kiểm tra thủ công trước khi xuất bản.
            </p>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs text-amber-200">
            <input
              type="checkbox"
              checked={factCheckAcknowledged}
              onChange={(e) => onAcknowledgeFactCheck(e.target.checked)}
              disabled={isPublished}
              className="h-4 w-4 accent-[#22C55E]"
            />
            <span>Tôi xác nhận đã kiểm tra và đối chiếu các thông tin trên là chính xác.</span>
          </label>
        </section>
      )}
    </>
  );
};

export default LinkedInWorkspaceCard;
