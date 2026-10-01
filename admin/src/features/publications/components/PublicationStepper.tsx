import React from "react";
import { FiCheck, FiGlobe, FiAlertCircle } from "react-icons/fi";
import { FaLinkedinIn } from "react-icons/fa";

interface PublicationStepperProps {
  isApproved: boolean;
  webPublished: boolean;
  publishWeb: boolean;
  publishLinkedin: boolean;
  linkedinStatus: string;
}

// Render horizontal publication pipeline stepper tracking Article, Web, and LinkedIn stages.
export const PublicationStepper: React.FC<PublicationStepperProps> = ({
  isApproved,
  webPublished,
  publishWeb,
  publishLinkedin,
  linkedinStatus,
}) => {
  const isLinkedinPublished = linkedinStatus === "PUBLISHED";
  const isLinkedinReady = ["READY", "PUBLISHING"].includes(linkedinStatus);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border pb-3">
        <h3 className="font-semibold text-content-primary text-sm">Tiến trình xuất bản</h3>
        <span className="text-xs text-content-muted">Web đăng trước, LinkedIn sau</span>
      </div>

      <div className="flex items-center justify-between max-w-2xl mx-auto px-4 py-2">
        {/* Step 1: Article */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div
            className={`size-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              isApproved
                ? "bg-emerald-950/60 text-emerald-400 border-2 border-emerald-500 shadow-sm"
                : "bg-amber-950/60 text-amber-400 border-2 border-amber-500"
            }`}
          >
            {isApproved ? <FiCheck className="text-base" /> : <FiAlertCircle className="text-base" />}
          </div>
          <span className="text-xs font-semibold text-content-primary">Bài viết</span>
          <span className="text-[11px] text-content-muted">
            {isApproved ? "Đã duyệt" : "Chờ duyệt"}
          </span>
        </div>

        {/* Connector 1 */}
        <div
          className={`flex-1 h-0.5 mx-3 transition-colors ${
            isApproved ? "bg-emerald-500/70" : "bg-surface-border"
          }`}
        />

        {/* Step 2: Web */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div
            className={`size-10 rounded-full flex items-center justify-center text-sm transition-colors ${
              webPublished
                ? "bg-emerald-950/60 text-emerald-400 border-2 border-emerald-500 shadow-sm"
                : publishWeb
                ? "bg-surface-elevated text-cyan-400 border-2 border-cyan-500/60"
                : "bg-surface-elevated text-content-muted border border-surface-border"
            }`}
          >
            <FiGlobe className="text-base" />
          </div>
          <span className="text-xs font-semibold text-content-primary">Web</span>
          <span className="text-[11px] text-content-muted">
            {webPublished ? "Đã đăng" : publishWeb ? "Chưa đăng" : "Không đăng"}
          </span>
        </div>

        {/* Connector 2 */}
        <div
          className={`flex-1 h-0.5 mx-3 transition-colors ${
            webPublished && publishLinkedin ? "bg-emerald-500/70" : "bg-surface-border"
          }`}
        />

        {/* Step 3: LinkedIn */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div
            className={`size-10 rounded-full flex items-center justify-center text-sm transition-colors ${
              isLinkedinPublished
                ? "bg-emerald-950/60 text-emerald-400 border-2 border-emerald-500 shadow-sm"
                : isLinkedinReady
                ? "bg-blue-950/60 text-blue-400 border-2 border-blue-500/70"
                : publishLinkedin
                ? "bg-surface-elevated text-indigo-400 border-2 border-indigo-500/60"
                : "bg-surface-elevated text-content-muted border border-surface-border"
            }`}
          >
            <FaLinkedinIn className="text-sm" />
          </div>
          <span className="text-xs font-semibold text-content-primary">LinkedIn</span>
          <span className="text-[11px] text-content-muted">
            {!publishLinkedin
              ? "Không đăng"
              : isLinkedinPublished
              ? "Đã đăng"
              : isLinkedinReady
              ? "Sẵn sàng"
              : "Chờ cấu hình"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicationStepper;
