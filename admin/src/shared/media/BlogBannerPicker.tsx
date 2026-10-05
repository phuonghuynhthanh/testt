import InputUploadBanner from "../input/InputUploadBanner";
import { AIImagePanel } from "./AIImagePanel";
import { PexelsImagePanel } from "./PexelsImagePanel";

// Keep uploaded, generated, and imported banners in one shared selection for both editors.
export const BlogBannerPicker = ({ file, objectKey, context, onFileChange, onUse, onBusyChange, disabled = false }: {
  file: File | null;
  objectKey: string;
  context: string;
  onFileChange: (file: File | null) => void;
  onUse: (objectKey: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) => <fieldset disabled={disabled} className="min-w-0 space-y-4">
  <InputUploadBanner fileImage={file} bannerUrl={objectKey} setBannerImage={onFileChange} disabled={disabled} />
  {(file || objectKey) && <button type="button" onClick={() => { onFileChange(null); onUse(""); }}
    className="text-xs text-rose-400 underline disabled:opacity-50">Gỡ ảnh bìa</button>}
  <PexelsImagePanel disabled={disabled} onUse={onUse} onBusyChange={onBusyChange} />
  <AIImagePanel purpose="BLOG_BANNER" context={context} disabled={disabled}
    onUse={(image) => onUse(image.media.objectKey)} />
</fieldset>;
