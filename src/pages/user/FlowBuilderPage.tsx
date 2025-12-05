import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowBuilder } from "@/components/user/FlowBuilder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const FlowBuilderPage = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const [flowExists, setFlowExists] = useState<boolean | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pageId, setPageId] = useState<string>("");
  const [flowType, setFlowType] = useState<'facebook' | 'instagram' | null>(null);

  useEffect(() => {
    const checkFlow = async () => {
      if (!flowId) {
        toast.error("Flow ID is missing");
        navigate("/dashboard");
        return;
      }

      // Try Facebook flows first
      const { data: fbData, error: fbError } = await supabase
        .from("chatbot_flows")
        .select("id, page_id")
        .eq("id", flowId)
        .single();

      if (fbData && !fbError) {
        setPageId(fbData.page_id);
        setFlowType('facebook');
        setFlowExists(true);
        return;
      }

      // Try Instagram flows
      const { data: igData, error: igError } = await supabase
        .from("instagram_chatbot_flows")
        .select("id, instagram_account_id")
        .eq("id", flowId)
        .single();

      if (igData && !igError) {
        setPageId(igData.instagram_account_id);
        setFlowType('instagram');
        setFlowExists(true);
        return;
      }

      toast.error("Flow not found");
      navigate("/dashboard");
    };

    checkFlow();
  }, [flowId, navigate]);

  const handleBack = () => {
    const tab = flowType === 'instagram' ? 'instagram-dm-flow' : 'flow';
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  };

  const handleConfirmExit = () => {
    const tab = flowType === 'instagram' ? 'instagram-dm-flow' : 'flow';
    setShowExitDialog(false);
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  };

  if (flowExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading flow...</p>
        </div>
      </div>
    );
  }

  if (!flowExists || !flowId || !flowType) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <ReactFlowProvider>
          <FlowBuilder 
            flowId={flowId}
            flowType={flowType}
            onBack={handleBack}
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </ReactFlowProvider>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your flow. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
