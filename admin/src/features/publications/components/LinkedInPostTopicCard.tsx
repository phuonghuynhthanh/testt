import React from "react";
import { Sparkle, PencilSimple, Lightbulb } from "@phosphor-icons/react";
import type { LinkedInAudience } from "../../../types/LinkedIn";
import type { LinkedInLinkPlacement } from "../../../types/Publication";
import type { PostLanguage } from "../../../types/Language";
import { PostLanguageSelect } from "../../../shared/ui/PostLanguageSelect";
import { SectionHeading } from "../../../shared/ui";

interface LinkedInPostTopicCardProps {
  immutable: boolean;
  authorMode: "manual" | "ai";
  onAuthorModeChange: (mode: "manual" | "ai") => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  context: string;
  onContextChange: (ctx: string) => void;
  audience: LinkedInAudience;
  onAudienceChange: (aud: LinkedInAudience) => void;
  language: PostLanguage;
  onLanguageChange: (lang: PostLanguage) => void;
  topics: string[];
  onProposeTopics: () => void;
  isProposingTopics: boolean;
  onGenerateAiDraft: () => void;
  isGeneratingDraft: boolean;
  hasContent: boolean;
  linkPlacement: LinkedInLinkPlacement;
  onLinkPlacementChange: (placement: LinkedInLinkPlacement) => void;
  /** Content editor rendered inside the card, between the generation controls and link placement. */
  contentSlot?: React.ReactNode;
}

const AUDIENCE_PRESETS = [
  "math",
  "competitive-programming",
  "software-engineering",
  "machine-learning",
  "systems",
];

// Topic authoring section supporting AI generation, custom input, and link placement.
export const LinkedInPostTopicCard: React.FC<LinkedInPostTopicCardProps> = ({
  immutable,
  authorMode,
  onAuthorModeChange,
  topic,
  onTopicChange,
  context,
  onContextChange,
  audience,
  onAudienceChange,
  language,
  onLanguageChange,
  topics,
  onProposeTopics,
  isProposingTopics,
  onGenerateAiDraft,
  isGeneratingDraft,
  hasContent,
  linkPlacement,
  onLinkPlacementChange,
  contentSlot,
}) => {
  return (
    <>
      {!immutable && (
        <div className="seg self-start">
          <button
            type="button"
            onClick={() => onAuthorModeChange("ai")}
            aria-selected={authorMode === "ai"}
            className={authorMode === "ai" ? "!text-purple-300" : ""}
          >
            <Sparkle size={14} weight="light" className="text-purple-400" />
            <span>Tạo bằng AI</span>
          </button>
          <button type="button" onClick={() => onAuthorModeChange("manual")} aria-selected={authorMode === "manual"}>
            <PencilSimple size={14} weight="light" />
            <span>Viết thủ công</span>
          </button>
        </div>
      )}

      <div className="panel p-4 space-y-4">
        <SectionHeading title="Chủ đề và nội dung" description="Chủ đề bài đăng và văn bản xuất bản" />

        <div>
          <label className="label">
            Chủ đề bài đăng <span className="text-rose-400">*</span>
          </label>
          <input
            disabled={immutable}
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="Nhập chủ đề bài đăng..."
            className="inp"
          />
        </div>

        {authorMode === "ai" && !immutable && (
          <>
            <div>
              <label className="label">Ngữ cảnh bổ sung</label>
              <textarea
                rows={3}
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                placeholder="Luận điểm, dữ liệu hoặc góc nhìn cần AI sử dụng..."
                className="inp"
              />
            </div>
            <div>
              <label className="label">Đối tượng độc giả</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAudienceChange(null)}
                  className={`chip transition-colors ${audience === null ? "!border-purple-500/40 !bg-purple-500/25 !text-purple-100" : "hover:bg-surface-hover"}`}
                >
                  Tự động
                </button>
                {AUDIENCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onAudienceChange(preset)}
                    className={`chip transition-colors ${audience === preset ? "!border-purple-500/40 !bg-purple-500/25 !text-purple-100" : "hover:bg-surface-hover"}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                value={audience ?? ""}
                onChange={(event) => onAudienceChange(event.target.value)}
                maxLength={300}
                placeholder="Hoặc nhập đối tượng riêng"
                className="inp sm mt-2"
              />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <PostLanguageSelect value={language} onChange={onLanguageChange} disabled={isGeneratingDraft || isProposingTopics} />
              <button
                type="button"
                disabled={!topic.trim() || isGeneratingDraft}
                onClick={onGenerateAiDraft}
                className="btn btn-ai"
              >
                <Sparkle size={16} weight="light" className={isGeneratingDraft ? "animate-spin" : ""} />
                <span>{isGeneratingDraft ? "Đang tạo bằng AI..." : hasContent ? "Tạo lại bằng AI" : "Tạo bản nháp bằng AI"}</span>
              </button>
              <button
                type="button"
                disabled={isProposingTopics}
                onClick={onProposeTopics}
                className="btn btn-ghost"
              >
                <Lightbulb size={16} weight="light" className={isProposingTopics ? "animate-spin" : ""} />
                <span>Gợi ý chủ đề</span>
              </button>
            </div>
          </>
        )}

        {authorMode === "ai" && topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map((item) => (
              <button
                key={item}
                type="button"
                disabled={immutable}
                onClick={() => onTopicChange(item)}
                className="rounded-lg border border-purple-500/30 bg-purple-950/20 px-3 py-1.5 text-left text-xs text-purple-200 transition-colors hover:bg-purple-900/40"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {contentSlot}

        <div>
          <label className="label">Vị trí liên kết website</label>
          <div className="seg">
            {(["NONE", "IN_POST"] as const).map((placement) => (
              <button
                key={placement}
                type="button"
                disabled={immutable}
                onClick={() => onLinkPlacementChange(placement)}
                aria-selected={linkPlacement === placement}
              >
                {placement === "NONE" ? "Không chèn liên kết" : "Chèn liên kết trong bài"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default LinkedInPostTopicCard;
