import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormList } from "@/components/user/form-builder/FormList";
import { FormBuilder } from "@/components/user/form-builder/FormBuilder";
import { FormSubmissions } from "@/components/user/form-builder/FormSubmissions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const FormBuilderWindow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const mode = searchParams.get("mode"); // "edit", "create", "submissions"
  const viewingSubmissionsFormId = searchParams.get("submissionsId");

  if (viewingSubmissionsFormId) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            onClick={() => navigate("/form-builder")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </div>
        <FormSubmissions formId={viewingSubmissionsFormId} />
      </div>
    );
  }

  if (viewingSubmissionsFormId || mode === "edit" || mode === "create") {
    // Fullscreen mode - no sidebar
    if (viewingSubmissionsFormId) {
      return (
        <div className="h-screen flex flex-col bg-background">
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard?tab=form-builder")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </div>
          <FormSubmissions formId={viewingSubmissionsFormId} />
        </div>
      );
    }

    return (
      <FormBuilder 
        formId={formId || undefined} 
        onBack={() => navigate("/dashboard?tab=form-builder")} 
      />
    );
  }

  // Redirect to dashboard if accessed without mode
  navigate("/dashboard?tab=form-builder");
  return null;
};

export default FormBuilderWindow;
