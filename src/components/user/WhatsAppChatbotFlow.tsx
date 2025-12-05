import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Play, Pause, BarChart3 } from "lucide-react";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  trigger_keyword: string | null;
  match_type: string;
  is_active: boolean;
  whatsapp_account_id: string;
  flow_data: any;
  created_at: string;
  updated_at: string;
}

interface WhatsAppAccount {
  id: string;
  phone_number: string;
  display_phone_number: string;
  status: string;
}

interface FlowStats {
  executions: number;
  success_rate: number;
  avg_completion_time: number;
}

export const WhatsAppChatbotFlow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>(searchParams.get("accountId") || "");
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [flowStats, setFlowStats] = useState<Record<string, FlowStats>>({});
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedFlowForStats, setSelectedFlowForStats] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchFlows();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setAccounts(data || []);
      
      if (data && data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching WhatsApp accounts:", error);
      toast.error("Failed to load WhatsApp accounts");
    }
  };

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_chatbot_flows")
        .select("*")
        .eq("user_id", user.id)
        .eq("whatsapp_account_id", selectedAccount)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlows(data || []);

      // Fetch stats for each flow
      data?.forEach(flow => fetchFlowStats(flow.id));
    } catch (error: any) {
      console.error("Error fetching flows:", error);
      toast.error("Failed to load flows");
    } finally {
      setLoading(false);
    }
  };

  const fetchFlowStats = async (flowId: string) => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_flow_executions")
        .select("status, triggered_at, completed_at")
        .eq("flow_id", flowId)
        .limit(100);

      if (error) throw error;

      const executions = data?.length || 0;
      const successful = data?.filter(e => e.status === "completed").length || 0;
      const success_rate = executions > 0 ? (successful / executions) * 100 : 0;
      
      const completionTimes = data
        ?.filter(e => e.completed_at)
        .map(e => new Date(e.completed_at!).getTime() - new Date(e.triggered_at).getTime()) || [];
      
      const avg_completion_time = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / 1000
        : 0;

      setFlowStats(prev => ({
        ...prev,
        [flowId]: { executions, success_rate, avg_completion_time }
      }));
    } catch (error) {
      console.error("Error fetching flow stats:", error);
    }
  };

  const createFlow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!selectedAccount) {
        toast.error("Please select a WhatsApp account first");
        return;
      }

      const { data, error } = await supabase
        .from("whatsapp_chatbot_flows")
        .insert({
          name: "Untitled Flow",
          description: "",
          user_id: user.id,
          whatsapp_account_id: selectedAccount,
          trigger_keyword: "",
          match_type: "exact",
          is_active: false,
          flow_data: { nodes: [], edges: [] }
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Flow created!");
      navigate(`/flow/${data.id}`);
    } catch (error: any) {
      console.error("Error creating flow:", error);
      toast.error("Failed to create flow");
    }
  };

  const toggleFlowStatus = async (flow: Flow) => {
    try {
      const { error } = await supabase
        .from("whatsapp_chatbot_flows")
        .update({ is_active: !flow.is_active })
        .eq("id", flow.id);

      if (error) throw error;
      
      toast.success(`Flow ${!flow.is_active ? 'activated' : 'deactivated'}`);
      fetchFlows();
    } catch (error: any) {
      console.error("Error toggling flow:", error);
      toast.error("Failed to update flow status");
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (!confirm("Are you sure you want to delete this flow? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_chatbot_flows")
        .delete()
        .eq("id", flowId);

      if (error) throw error;
      
      toast.success("Flow deleted successfully");
      fetchFlows();
    } catch (error: any) {
      console.error("Error deleting flow:", error);
      toast.error("Failed to delete flow");
    }
  };

  const startEditing = (flow: Flow) => {
    setEditingFlow(flow);
  };

  const cancelEditing = () => {
    setEditingFlow(null);
  };

  const saveEditing = async () => {
    if (!editingFlow) return;

    try {
      const { error } = await supabase
        .from("whatsapp_chatbot_flows")
        .update({
          name: editingFlow.name,
          description: editingFlow.description,
          trigger_keyword: editingFlow.trigger_keyword,
          match_type: editingFlow.match_type
        })
        .eq("id", editingFlow.id);

      if (error) throw error;
      
      toast.success("Flow updated successfully");
      setEditingFlow(null);
      fetchFlows();
    } catch (error: any) {
      console.error("Error updating flow:", error);
      toast.error("Failed to update flow");
    }
  };

  const showStats = (flowId: string) => {
    setSelectedFlowForStats(flowId);
    setShowStatsDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Chatbot Flows</h2>
          <p className="text-muted-foreground">Create automated conversation flows for WhatsApp</p>
        </div>
        <Button onClick={createFlow} disabled={!selectedAccount}>
          <Plus className="mr-2 h-4 w-4" />
          New Flow
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="account">WhatsApp Account:</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.display_phone_number || account.phone_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No flows yet. Create your first automated flow!</p>
            <Button onClick={createFlow} disabled={!selectedAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flows.map((flow) => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {editingFlow?.id === flow.id ? (
                        <Input
                          value={editingFlow.name}
                          onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        flow.name
                      )}
                      <Badge variant={flow.is_active ? "default" : "secondary"}>
                        {flow.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {editingFlow?.id === flow.id ? (
                        <Input
                          value={editingFlow.description || ""}
                          onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                          className="mt-2"
                          placeholder="Flow description"
                        />
                      ) : (
                        flow.description || "No description"
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingFlow?.id === flow.id ? (
                      <>
                        <Button size="sm" onClick={saveEditing}>Save</Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/flow/${flow.id}`)}>
                          Edit Flow
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditing(flow)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => showStats(flow.id)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={flow.is_active ? "secondary" : "default"}
                          onClick={() => toggleFlowStatus(flow)}
                        >
                          {flow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteFlow(flow.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Trigger Keywords</p>
                    {editingFlow?.id === flow.id ? (
                      <Input
                        value={editingFlow.trigger_keyword || ""}
                        onChange={(e) => setEditingFlow({ ...editingFlow, trigger_keyword: e.target.value })}
                        placeholder="e.g., hello, start"
                      />
                    ) : (
                      <p className="font-medium">{flow.trigger_keyword || "None"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Match Type</p>
                    {editingFlow?.id === flow.id ? (
                      <Select
                        value={editingFlow.match_type}
                        onValueChange={(value) => setEditingFlow({ ...editingFlow, match_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact">Exact</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="starts_with">Starts With</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium capitalize">{flow.match_type}</p>
                    )}
                  </div>
                  {flowStats[flow.id] && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Executions</p>
                        <p className="font-medium">{flowStats[flow.id].executions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="font-medium">{flowStats[flow.id].success_rate.toFixed(1)}%</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flow Statistics</DialogTitle>
            <DialogDescription>Performance metrics for this flow</DialogDescription>
          </DialogHeader>
          {selectedFlowForStats && flowStats[selectedFlowForStats] && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{flowStats[selectedFlowForStats].executions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{flowStats[selectedFlowForStats].success_rate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                <p className="text-2xl font-bold">{flowStats[selectedFlowForStats].avg_completion_time.toFixed(1)}s</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};