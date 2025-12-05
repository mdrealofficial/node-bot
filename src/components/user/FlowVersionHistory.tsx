import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
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

interface FlowVersion {
  id: string;
  version_number: number;
  version_name: string;
  description: string | null;
  created_at: string;
  flow_data: {
    nodes: any[];
    edges: any[];
  };
}

interface FlowVersionHistoryProps {
  open: boolean;
  onClose: () => void;
  flowId: string;
  currentVersion: number;
  onRestore: (versionId: string, flowData: any) => void;
}

export const FlowVersionHistory = ({
  open,
  onClose,
  flowId,
  currentVersion,
  onRestore,
}: FlowVersionHistoryProps) => {
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<FlowVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<FlowVersion | null>(null);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, flowId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("flow_versions")
        .select("*")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions((data as unknown) as FlowVersion[]);
    } catch (error: any) {
      toast.error("Failed to load version history: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    try {
      await onRestore(selectedVersion.id, selectedVersion.flow_data);
      toast.success(`Restored to version ${selectedVersion.version_number}`);
      setShowRestoreDialog(false);
      setSelectedVersion(null);
      onClose();
    } catch (error: any) {
      toast.error("Failed to restore version: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!versionToDelete) return;

    try {
      const { error } = await supabase
        .from("flow_versions")
        .delete()
        .eq("id", versionToDelete.id);

      if (error) throw error;
      
      toast.success("Version deleted");
      setVersions(versions.filter(v => v.id !== versionToDelete.id));
      setShowDeleteDialog(false);
      setVersionToDelete(null);
    } catch (error: any) {
      toast.error("Failed to delete version: " + error.message);
    }
  };

  const getVersionStats = (version: FlowVersion) => {
    const nodeCount = version.flow_data?.nodes?.length || 0;
    const edgeCount = version.flow_data?.edges?.length || 0;
    return { nodeCount, edgeCount };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of your flow
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {versions.map((version) => {
                  const stats = getVersionStats(version);
                  const isCurrentVersion = version.version_number === currentVersion;
                  
                  return (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                        isCurrentVersion ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">
                              {version.version_name || `Version ${version.version_number}`}
                            </h4>
                            {isCurrentVersion && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              v{version.version_number}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(version.created_at), "PPp")}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <Badge variant="secondary" className="text-xs">
                              {stats.nodeCount} node{stats.nodeCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stats.edgeCount} connection{stats.edgeCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>

                          {version.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {version.description}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          {!isCurrentVersion && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedVersion(version);
                                  setShowRestoreDialog(true);
                                }}
                                title="Restore this version"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setVersionToDelete(version);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete this version"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your flow to version {selectedVersion?.version_number}. 
              Your current flow will be saved as a new version before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete version {versionToDelete?.version_number}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
