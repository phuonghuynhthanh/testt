import { useBlog } from "../../../context/BlogContext";
import ButtonTheme from "../../../shared/button/ButtonTheme";
import BlogEditor from "./components/BlogEditor";
import BlogFinalPreview from "./components/BlogFinalPreview";
import BlogKeyword from "./components/BlogKeyword";
import BlogOutline from "./components/BlogOutline";
import TitleGenerate from "./components/TitleGenerate";

export function AgentCreateBlog() {
  const { state: blogState, reset } = useBlog();

  const renderStep = () => {
    switch (blogState.currentStep) {
      case 1:
        return <BlogKeyword />;
      case 2:
        return <TitleGenerate state={blogState.currentStep} />;
      case 3:
        return <BlogOutline />;
      case 4:
        return <BlogEditor />;
      case 5:
        return !blogState.title?.trim() ? (
          <TitleGenerate state={blogState.currentStep} />
        ) : (
          <BlogFinalPreview />
        );
      case 6:
        return <BlogFinalPreview />;

      default:
        return <div>Invalid step</div>;
    }
  };

  return (
    <div className="">
      <div>
        <div className="flex justify-between w-full ">
          <h1 className="text-2xl font-semibold text-primary-white">
            Create Blog
          </h1>
          <ButtonTheme variant="outline" onClick={() => reset()}>
            Cancel
          </ButtonTheme>
        </div>
        <hr className="mt-2" />
      </div>
      {renderStep()}
    </div>
  );
}
