import { assets } from "../../assets/assets";

const Header = () => {
  return (
    <div className="h-[calc(100%-10px)] w-full flex justify-center items-center bg-primary-black">
      <img
        src={assets.logoVnBrokersText}
        alt="logoVnBrokersText"
        className="h-20 w-auto"
      />
    </div>
  );
};

export default Header;
