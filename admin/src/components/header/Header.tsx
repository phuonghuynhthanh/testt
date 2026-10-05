import { assets } from "../../assets/assets";

// Render the desktop brand header with centered logo and subtle boundary border.
const Header = () => {
  return (
    <div className="h-full w-full flex justify-center items-center bg-surface-base border-b border-surface-border">
      <img
        src={assets.logoVietQuant}
        alt="logoVietQuant"
        className="h-14 sm:h-16 w-auto object-contain py-2"
      />
    </div>
  );
};

export default Header;
