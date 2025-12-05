import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Play, Pause, Check, X, Instagram } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface InstagramFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_keyword: string | null;
  match_type: 'exact' | 'contains' | 'starts_with';
  created_at: string;
  instagram_account_id: string;
}

interface InstagramAccount {
  id: string;
  account_name: string;
  instagram_username: string;
  profile_picture_url?: string | null;
}

export const InstagramChatbotFlow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<InstagramFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAccountFilter, setActiveAccountFilter] = useState<string>("all");
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [editingMatchType, setEditingMatchType] = useState<'exact' | 'contains' | 'starts_with'>('exact');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [newFlowKeyword, setNewFlowKeyword] = useState("");
  const [newFlowMatchType, setNewFlowMatchType] = useState<'exact' | 'contains' | 'starts_with'>('exact');
  const [newFlowAccountId, setNewFlowAccountId] = useState("");

  useEffect(() => {
    fetchFlows();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length === 1 && !activeAccountFilter) {
      setActiveAccountFilter(accounts[0].id);
    }
  }, [accounts]);

  const fetchAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("instagram_accounts")
        .select("id, account_name, instagram_username, profile_picture_url")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching Instagram accounts:", error);
      toast.error("Failed to load Instagram accounts");
    }
  };

  const fetchFlows = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("instagram_chatbot_flows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (activeAccountFilter && activeAccountFilter !== "all") {
        query = query.eq("instagram_account_id", activeAccountFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFlows((data || []).map(f => ({
        ...f,
        match_type: f.match_type as 'exact' | 'contains' | 'starts_with'
      })));
    } catch (error: any) {
      console.error("Error fetching Instagram flows:", error);
      toast.error("Failed to load Instagram flows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [activeAccountFilter, user]);

  const toggleFlowStatus = async (flowId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("instagram_chatbot_flows")
        .update({ is_active: !currentStatus })
        .eq("id", flowId);

      if (error) throw error;

      setFlows(flows.map(flow => 
        flow.id === flowId ? { ...flow, is_active: !currentStatus } : flow
      ));

      toast.success(`Flow ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error: any) {
      console.error("Error toggling flow status:", error);
      toast.error("Failed to update flow status");
    }
  };

  const startEditing = (flow: InstagramFlow) => {
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

  const saveEdit = async (flowId: string) => {
    if (!editingName.trim()) {
      toast.error("Flow name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("instagram_chatbot_flows")
        .update({
          name: editingName,
          trigger_keyword: editingKeywords || null,
          match_type: editingMatchType,
        })
        .eq("id", flowId);

      if (error) throw error;

      setFlows(flows.map(flow =>
        flow.id === flowId
          ? { ...flow, name: editingName, trigger_keyword: editingKeywords, match_type: editingMatchType }
          : flow
      ));

      cancelEditing();
      toast.success("Flow updated successfully");
    } catch (error: any) {
      console.error("Error updating flow:", error);
      toast.error("Failed to update flow");
    }
  };

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!flowToDelete) return;

    try {
      const { error } = await supabase
        .from("instagram_chatbot_flows")
        .delete()
        .eq("id", flowToDelete);

      if (error) throw error;

      setFlows(flows.filter(flow => flow.id !== flowToDelete));
      toast.success("Flow deleted successfully");
    } catch (error: any) {
      console.error("Error deleting flow:", error);
      toast.error("Failed to delete flow");
    } finally {
      setShowDeleteDialog(false);
      setFlowToDelete(null);
    }
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      toast.error("Flow name is required");
      return;
    }

    if (!newFlowAccountId) {
      toast.error("Please select an Instagram account");
      return;
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("instagram_chatbot_flows")
        .insert({
          user_id: user.id,
          instagram_account_id: newFlowAccountId,
          name: newFlowName,
          description: newFlowDescription || null,
          trigger_keyword: newFlowKeyword || null,
          match_type: newFlowMatchType,
          is_active: false,
          flow_data: { nodes: [], edges: [] },
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Flow created successfully");
      setShowCreateDialog(false);
      setNewFlowName("");
      setNewFlowDescription("");
      setNewFlowKeyword("");
      setNewFlowMatchType('exact');
      setNewFlowAccountId("");
      
      // Navigate to the flow builder
      navigate(`/flow-builder/${data.id}`);
    } catch (error: any) {
      console.error("Error creating flow:", error);
      toast.error("Failed to create flow");
    }
  };

  const openFlowBuilder = (flowId: string) => {
    navigate(`/flow-builder/${flowId}`);
  };

  if (accounts.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Instagram DM Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Instagram className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No Instagram accounts connected. Please connect an Instagram account first.
            </p>
            <Button onClick={() => navigate('/dashboard?tab=pages')}>
              Connect Instagram Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Instagram DM Flows
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Flow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Instagram DM Flow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Instagram Account</Label>
                    <Select value={newFlowAccountId} onValueChange={setNewFlowAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            @{account.instagram_username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Flow Name</Label>
                    <Input
                      value={newFlowName}
                      onChange={(e) => setNewFlowName(e.target.value)}
                      placeholder="e.g., Welcome Flow"
                    />
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newFlowDescription}
                      onChange={(e) => setNewFlowDescription(e.target.value)}
                      placeholder="Describe what this flow does"
                    />
                  </div>

                  <div>
                    <Label>Trigger Keyword (Optional)</Label>
                    <Input
                      value={newFlowKeyword}
                      onChange={(e) => setNewFlowKeyword(e.target.value)}
                      placeholder="e.g., start, help, menu"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to trigger on any message
                    </p>
                  </div>

                  {newFlowKeyword && (
                    <div>
                      <Label>Match Type</Label>
                      <Select value={newFlowMatchType} onValueChange={(value: any) => setNewFlowMatchType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact">Exact Match</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="starts_with">Starts With</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={handleCreateFlow} className="w-full">
                    Create Flow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length > 1 && (
            <div className="mb-4">
              <Label>Filter by Account</Label>
              <Select value={activeAccountFilter} onValueChange={setActiveAccountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.instagram_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading flows...</p>
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No Instagram DM flows yet. Create your first flow to automate conversations!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {flows.map((flow) => (
                <Card key={flow.id} className="relative">
                  <CardContent className="p-4">
                    {editingFlowId === flow.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Flow name"
                        />
                        <Input
                          value={editingKeywords}
                          onChange={(e) => setEditingKeywords(e.target.value)}
                          placeholder="Trigger keywords"
                        />
                        <Select value={editingMatchType} onValueChange={(value: any) => setEditingMatchType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exact">Exact Match</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="starts_with">Starts With</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(flow.id)}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{flow.name}</h3>
                            <Badge variant={flow.is_active ? "default" : "secondary"}>
                              {flow.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {flow.description && (
                            <p className="text-sm text-muted-foreground mb-2">{flow.description}</p>
                          )}
                          {flow.trigger_keyword && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Keyword: </span>
                              <code className="bg-muted px-2 py-0.5 rounded">{flow.trigger_keyword}</code>
                              <span className="text-muted-foreground ml-2">({flow.match_type})</span>
                            </div>
                          )}
                          {!flow.trigger_keyword && (
                            <div className="text-sm text-muted-foreground">
                              Triggers on any message
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFlowBuilder(flow.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Flow
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(flow)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={flow.is_active ? "secondary" : "default"}
                            onClick={() => toggleFlowStatus(flow.id, flow.is_active)}
                          >
                            {flow.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(flow.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flow? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
