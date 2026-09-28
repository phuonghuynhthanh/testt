import { useTranslation } from "react-i18next";
import { LuConstruction } from "react-icons/lu";

export default function PageUnDevelop() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-black">
      <div className="text-center">
        <LuConstruction className="mx-auto h-16 w-16 text-primary-white mb-4" />
        <h1 className="text-3xl font-bold text-primary-white/70 mb-2">
          {t("common.development")}
        </h1>
        <p className="text-gray-600 max-w-md">{t("common.coming-soon")}</p>
      </div>
    </div>
  );
}
