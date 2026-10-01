import React from "react";
import { FaLinkedin } from "react-icons/fa";
import PublicationChannelCard from "../../publications/components/PublicationChannelCard";
import type { LinkedInMode } from "../../../types/Publication";

interface BlogCreatePublicationSectionProps {
  publishWeb: boolean;
  publishLinkedin: boolean;
  mode: LinkedInMode;
  includeWebLink: boolean;
  onToggleWeb: () => void;
  onToggleLinkedin: () => void;
  onChangeMode: (mode: LinkedInMode) => void;
  onToggleWebLink: (checked: boolean) => void;
}

// Render the publication configuration section during blog creation matching publication page layout.
export const BlogCreatePublicationSection: React.FC<BlogCreatePublicationSectionProps> = ({
  publishWeb,
  publishLinkedin,
  mode,
  includeWebLink,
  onToggleWeb,
  onToggleLinkedin,
  onChangeMode,
  onToggleWebLink,
}) => {
  return (
    <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-6">
      <div className="flex flex-col gap-1 border-b border-surface-border pb-4">
        <h3 className="font-semibold text-content-primary text-base">Chọn nơi đăng bài</h3>
        <p className="text-xs text-content-muted">
          Lưu chờ duyệt chỉ lưu bài viết và lựa chọn kênh, chưa đăng công khai.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={publishLinkedin ? "lg:col-span-5 space-y-6" : "lg:col-span-12 space-y-6"}>
          <PublicationChannelCard
            publishWeb={publishWeb}
            publishLinkedin={publishLinkedin}
            mode={mode}
            includeWebLink={includeWebLink}
            settingsDirty={false}
            isSaving={false}
            isPublished={false}
            onToggleWeb={onToggleWeb}
            onToggleLinkedin={onToggleLinkedin}
            onChangeMode={onChangeMode}
            onToggleWebLink={onToggleWebLink}
            onSaveSettings={() => {}}
            hideSaveButton={true}
          />
        </div>

        {publishLinkedin && (
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 shadow-sm flex flex-col items-start justify-center space-y-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-surface-elevated text-content-muted">
                <FaLinkedin className="text-2xl text-[#0a66c2]" />
              </div>
              <h4 className="text-sm font-semibold text-content-primary">Lưu bài viết để soạn nội dung LinkedIn</h4>
              <p className="max-w-sm text-xs leading-relaxed text-content-muted">
                Bấm “Lưu chờ duyệt” ở thanh dưới. Sau đó, soạn hoặc tạo nội dung LinkedIn, chọn ảnh và kiểm tra trước khi đăng. Chọn kênh LinkedIn chưa tự động đăng bài.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogCreatePublicationSection;
