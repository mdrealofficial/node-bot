import { useNavigate, useSearchParams } from "react-router-dom";
import { LandingPageBuilder } from "@/components/user/landing-page/LandingPageBuilder";

const PageBuilderWindow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const pageId = searchParams.get("pageId");

  // Only show builder in edit/create mode (fullscreen, no sidebar)
  if (mode === "edit" || mode === "create") {
    return (
      <LandingPageBuilder 
        pageId={pageId || undefined} 
        onBack={() => navigate("/dashboard?tab=page-builder")} 
      />
    );
  }

  // Redirect to dashboard if accessed without mode
  navigate("/dashboard?tab=page-builder");
  return null;
};

export default PageBuilderWindow;
