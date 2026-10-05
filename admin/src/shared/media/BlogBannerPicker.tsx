import { useState } from "react";
import { Images, Sparkle, UploadSimple } from "@phosphor-icons/react";
import InputUploadBanner, { BannerPreview } from "../input/InputUploadBanner";
import { AIImagePanel } from "./AIImagePanel";
import { PexelsImagePanel } from "./PexelsImagePanel";

type BannerTab = "upload" | "ai" | "stock";

const TABS = [
  { value: "upload", label: "Tải lên", Icon: UploadSimple },
  { value: "ai", label: "Tạo bằng AI", Icon: Sparkle },
  { value: "stock", label: "Kho ảnh", Icon: Images },
] as const;

// Keep uploaded, generated, and imported banners in one shared selection for both editors.
export const BlogBannerPicker = ({ file, objectKey, context, onFileChange, onUse, onBusyChange, disabled = false }: {
  file: File | null;
  objectKey: string;
  context: string;
  onFileChange: (file: File | null) => void;
  onUse: (objectKey: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) => {
  const [tab, setTab] = useState<BannerTab>("upload");

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <BannerPreview
        fileImage={file}
        bannerUrl={objectKey}
        onClear={file || objectKey ? () => { onFileChange(null); onUse(""); } : undefined}
      />

      <div className="seg" role="tablist">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            <Icon size={14} weight="light" />
            {label}
          </button>
        ))}
      </div>

      <div className={tab === "upload" ? "" : "hidden"}>
        <InputUploadBanner fileImage={file} bannerUrl={objectKey} setBannerImage={onFileChange} disabled={disabled} showPreview={false} />
      </div>
      <div className={tab === "stock" ? "" : "hidden"}>
        <PexelsImagePanel disabled={disabled} onUse={onUse} onBusyChange={onBusyChange} />
      </div>
      <div className={tab === "ai" ? "" : "hidden"}>
        <AIImagePanel
          purpose="BLOG_BANNER"
          context={context}
          disabled={disabled}
          onUse={(image) => onUse(image.media.objectKey)}
        />
      </div>
    </fieldset>
  );
};
