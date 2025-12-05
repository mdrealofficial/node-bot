import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Play, Pause, Check, X, History, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_keyword: string | null;
  match_type: 'exact' | 'partial';
  created_at: string;
  page_id: string;
}

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
}

interface FlowStats {
  total: number;
  completed: number;
  failed: number;
  completionRate: number;
}

interface ExecutionHistory {
  id: string;
  status: string;
  triggered_at: string;
  completed_at: string | null;
  error_message: string | null;
  subscriber_psid: string;
}

export const ChatbotFlow = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePageFilter, setActivePageFilter] = useState<string>("");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [editingMatchType, setEditingMatchType] = useState<'exact' | 'partial'>('exact');
  const [flowStats, setFlowStats] = useState<Record<string, FlowStats>>({});
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedFlowForHistory, setSelectedFlowForHistory] = useState<Flow | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  // Get pageId from URL params or localStorage on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageIdFromUrl = urlParams.get('pageId');
    const savedPageId = localStorage.getItem('selectedPageFilter');
    
    if (pageIdFromUrl) {
      setActivePageFilter(pageIdFromUrl);
      localStorage.setItem('selectedPageFilter', pageIdFromUrl);
    } else if (savedPageId) {
      setActivePageFilter(savedPageId);
    }
  }, []);

  // Save to localStorage whenever page filter changes
  useEffect(() => {
    if (activePageFilter) {
      localStorage.setItem('selectedPageFilter', activePageFilter);
    }
  }, [activePageFilter]);

  useEffect(() => {
    fetchFlows();
    fetchPages();
  }, []);

  useEffect(() => {
    // Auto-select page if only one is connected and no page is already selected
    if (pages.length === 1 && !activePageFilter) {
      setActivePageFilter(pages[0].id);
    }
  }, [pages]);

  const fetchFlowStats = async (flowId: string) => {
    try {
      const { data, error } = await supabase
        .from("flow_executions")
        .select("status")
        .eq("flow_id", flowId);

      if (error) throw error;

      const total = data?.length || 0;
      const completed = data?.filter(e => e.status === 'completed').length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, failed, completionRate };
    } catch (error) {
      console.error("Failed to load flow stats:", error);
      return { total: 0, completed: 0, failed: 0, completionRate: 0 };
    }
  };

  const fetchExecutionHistory = async (flowId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("flow_executions")
        .select("id, status, triggered_at, completed_at, error_message, subscriber_psid")
        .eq("flow_id", flowId)
        .order("triggered_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutionHistory(data || []);
    } catch (error: any) {
      toast.error("Failed to load execution history: " + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryDialog = (flow: Flow) => {
    setSelectedFlowForHistory(flow);
    setShowHistoryDialog(true);
    fetchExecutionHistory(flow.id);
  };

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("facebook_pages")
        .select("id, page_name, page_id")
        .order("connected_at", { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      console.error("Failed to load pages:", error);
    }
  };

  const fetchFlows = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("id, name, description, is_active, trigger_keyword, created_at, page_id, facebook_pages(page_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Add match_type with default value since migration may not be applied yet
      const flowsWithMatchType = (data || []).map(flow => ({
        ...flow,
        match_type: (flow as any).match_type || 'exact' as 'exact' | 'partial'
      }));
      setFlows(flowsWithMatchType as Flow[]);

      // Fetch stats for each flow
      const stats: Record<string, FlowStats> = {};
      for (const flow of flowsWithMatchType) {
        stats[flow.id] = await fetchFlowStats(flow.id);
      }
      setFlowStats(stats);
    } catch (error: any) {
      toast.error("Failed to load flows: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async () => {
    if (!activePageFilter) {
      toast.error("Please select a Facebook page");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("chatbot_flows")
        .insert({
          name: "Untitled Flow",
          trigger_keyword: null,
          match_type: 'exact',
          user_id: user.id,
          page_id: activePageFilter,
          flow_data: {
            nodes: [
              {
                id: "start",
                type: "start",
                position: { x: 250, y: 50 },
                data: { 
                  label: "Start Flow",
                  flowName: "Untitled Flow",
                  triggerKeyword: "",
                  matchType: "exact"
                },
              },
            ],
            edges: [],
          },
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        toast.success("Flow created successfully");
        // Navigate to flow builder
        navigate(`/flow-builder/${data.id}`);
      }
    } catch (error: any) {
      toast.error("Failed to create flow: " + error.message);
    }
  };

  const toggleFlowStatus = async (flowId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({ is_active: !currentStatus })
        .eq("id", flowId);

      if (error) throw error;

      setFlows(flows.map(f => 
        f.id === flowId ? { ...f, is_active: !currentStatus } : f
      ));
      toast.success(`Flow ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error: any) {
      toast.error("Failed to update flow: " + error.message);
    }
  };

  const deleteFlow = async (flowId: string) => {
    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .delete()
        .eq("id", flowId);

      if (error) throw error;

      setFlows(flows.filter(f => f.id !== flowId));
      toast.success("Flow deleted successfully");
      setShowDeleteDialog(false);
      setFlowToDelete(null);
    } catch (error: any) {
      toast.error("Failed to delete flow: " + error.message);
    }
  };

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowDeleteDialog(true);
  };

  const startEditing = (flow: Flow) => {
    setEditingFlowId(flow.id);
    setEditingName(flow.name);
    setEditingKeywords(flow.trigger_keyword || "");
    setEditingMatchType(flow.match_type);
  };

  const cancelEditing = () => {
    setEditingFlowId(null);
    setEditingName("");
    setEditingKeywords("");
    setEditingMatchType('exact');
  };

  const saveEditing = async () => {
    if (!editingFlowId) return;
    
    if (!editingName.trim()) {
      toast.error("Flow name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({
          name: editingName,
          trigger_keyword: editingKeywords.trim() || null,
          match_type: editingMatchType,
        })
        .eq("id", editingFlowId);

      if (error) throw error;

      toast.success("Flow updated successfully");
      setFlows(flows.map(f => 
        f.id === editingFlowId 
          ? { ...f, name: editingName, trigger_keyword: editingKeywords.trim() || null, match_type: editingMatchType }
          : f
      ));
      cancelEditing();
    } catch (error: any) {
      toast.error("Failed to update flow: " + error.message);
    }
  };

  const filteredFlows = activePageFilter 
    ? flows.filter(flow => flow.page_id === activePageFilter)
    : flows;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Chatbot Flows</h2>
          <p className="text-sm text-muted-foreground">
            Create interactive messaging flows with visual builder
          </p>
        </div>
      </div>

      {/* Page Selection Dropdown */}
      {loading ? (
        <div className="text-center py-12">Loading pages...</div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No Facebook pages connected. Please connect a page from the Connected Pages tab first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label htmlFor="page-select" className="text-sm font-medium mb-2 block">
              Select Facebook Page
            </Label>
            <Select value={activePageFilter} onValueChange={setActivePageFilter}>
              <SelectTrigger id="page-select" className="bg-card border-2 h-11">
                <SelectValue placeholder="Choose a page to manage flows">
                  {activePageFilter && (
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      <span>{pages.find(p => p.id === activePageFilter)?.page_name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                {pages.map((page) => (
                  <SelectItem 
                    key={page.id} 
                    value={page.id}
                    className={activePageFilter === page.id ? "bg-primary/10 data-[highlighted]:bg-primary/15" : ""}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      <span className={activePageFilter === page.id ? "font-semibold" : ""}>
                        {page.page_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({flows.filter(f => f.page_id === page.id).length} flows)
                      </span>
                      {activePageFilter === page.id && (
                        <Check className="h-4 w-4 text-primary ml-1" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activePageFilter && (
            <Button
              onClick={createFlow}
              className="mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Flow
            </Button>
          )}
        </div>
      )}

      {/* Create Flow Dialog */}

      {/* Flows List */}
      {activePageFilter && filteredFlows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No flows created for this page yet. Click "New Flow" to create one!
            </p>
          </CardContent>
        </Card>
      ) : activePageFilter ? (
        <div className="grid gap-3">
          {filteredFlows.map((flow: any) => (
            <Card key={flow.id} className="overflow-hidden border-l-4 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ borderLeftColor: flow.is_active ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
              {editingFlowId === flow.id ? (
                <CardHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Flow Name</Label>
                      <Input
                        id="edit-name"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Enter flow name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-keywords">Trigger Keywords (comma-separated)</Label>
                      <Textarea
                        id="edit-keywords"
                        value={editingKeywords}
                        onChange={(e) => setEditingKeywords(e.target.value)}
                        placeholder="e.g., help, support, info"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-match-type">Match Type</Label>
                      <Select value={editingMatchType} onValueChange={(value: 'exact' | 'partial') => setEditingMatchType(value)}>
                        <SelectTrigger id="edit-match-type" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact">Exact Match (whole word)</SelectItem>
                          <SelectItem value="partial">Partial Match (substring)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEditing} size="sm">
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={cancelEditing} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              ) : (
                <>
                  {/* Header Section */}
                  <CardHeader className="pb-3 bg-gradient-to-br from-background via-background to-muted/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <CardTitle className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            {flow.name}
                          </CardTitle>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 shadow-sm ${
                            flow.is_active 
                              ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-primary/20' 
                              : 'bg-muted/80 text-muted-foreground'
                          }`}>
                            {flow.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5">
                            <Facebook className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">{flow.facebook_pages?.page_name}</span>
                          </div>

                          {flow.trigger_keyword && (
                            <>
                              {flow.trigger_keyword.split(',').map((keyword: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-1 bg-gradient-to-r from-primary/15 to-primary/10 text-primary rounded-md text-xs font-semibold border border-primary/20 hover-scale shadow-sm transition-all">
                                  {keyword.trim()}
                                </span>
                              ))}
                              <span className="px-2.5 py-1 bg-gradient-to-r from-accent/15 to-accent/10 text-accent-foreground rounded-md text-xs font-semibold border border-accent/20 shadow-sm">
                                {flow.match_type === 'exact' ? '🎯 Exact' : '🔍 Partial'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stats Section - Right Side */}
                      {flowStats[flow.id] && (
                        <div className="flex gap-1.5 shrink-0">
                          <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-950/50 dark:via-blue-950/30 dark:to-blue-900/50 p-1.5 rounded-lg text-center min-w-[58px] border border-blue-200/50 dark:border-blue-800/30 shadow-sm hover-scale transition-all">
                            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">Total</div>
                            <div className="text-base font-bold text-blue-900 dark:text-blue-100">{flowStats[flow.id].total}</div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-green-950/50 dark:via-green-950/30 dark:to-green-900/50 p-1.5 rounded-lg text-center min-w-[58px] border border-green-200/50 dark:border-green-800/30 shadow-sm hover-scale transition-all">
                            <div className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-0.5">Done</div>
                            <div className="text-base font-bold text-green-900 dark:text-green-100">{flowStats[flow.id].completed}</div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-red-50 via-red-50 to-red-100 dark:from-red-950/50 dark:via-red-950/30 dark:to-red-900/50 p-1.5 rounded-lg text-center min-w-[58px] border border-red-200/50 dark:border-red-800/30 shadow-sm hover-scale transition-all">
                            <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-0.5">Failed</div>
                            <div className="text-base font-bold text-red-900 dark:text-red-100">{flowStats[flow.id].failed}</div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 dark:from-purple-950/50 dark:via-purple-950/30 dark:to-purple-900/50 p-1.5 rounded-lg text-center min-w-[58px] border border-purple-200/50 dark:border-purple-800/30 shadow-sm hover-scale transition-all">
                            <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-0.5">Rate</div>
                            <div className="text-base font-bold text-purple-900 dark:text-purple-100">{flowStats[flow.id].completionRate}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {/* Actions Section */}
                  <CardContent className="pt-0 pb-2 border-t bg-muted/20">
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      <Button
                        variant={flow.is_active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFlowStatus(flow.id, flow.is_active)}
                        className="hover-scale"
                      >
                        {flow.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/flow-builder/${flow.id}`)}
                        className="hover-scale"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Flow
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(flow)}
                        className="hover-scale"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHistoryDialog(flow)}
                        title="View Execution History"
                        className="hover-scale"
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(flow.id)}
                        className="hover-scale ml-auto text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}
          </Card>
        ))}
      </div>
      ) : null}

      {/* Execution History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Execution History: {selectedFlowForHistory?.name}
            </DialogTitle>
          </DialogHeader>
          
          {loadingHistory ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading execution history...
            </div>
          ) : executionHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No executions found for this flow yet.
            </div>
          ) : (
            <div className="space-y-4">
              {executionHistory.map((execution) => (
                <Card key={execution.id} className={
                  execution.status === 'completed' ? 'border-green-200' :
                  execution.status === 'failed' ? 'border-red-200' :
                  'border-yellow-200'
                }>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            execution.status === 'completed' ? 'bg-green-100 text-green-700' :
                            execution.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {execution.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Subscriber: {execution.subscriber_psid}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Triggered: {new Date(execution.triggered_at).toLocaleString()}
                        </div>
                        {execution.completed_at && (
                          <div className="text-sm text-muted-foreground">
                            Completed: {new Date(execution.completed_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {execution.error_message && (
                    <CardContent className="pt-0">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-xs font-medium text-red-700 mb-1">Error Message:</div>
                        <div className="text-sm text-red-600">{execution.error_message}</div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the flow
              and all its execution history from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFlowToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => flowToDelete && deleteFlow(flowToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Flow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
