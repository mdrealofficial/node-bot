import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Activity, CheckCircle, XCircle, Clock } from "lucide-react";

interface Flow {
  id: string;
  name: string;
}

interface FlowStats {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  completionRate: number;
  avgExecutionTime: number;
}

interface NodeStats {
  nodeId: string;
  nodeType: string;
  successCount: number;
  errorCount: number;
  totalCount: number;
  avgExecutionTime: number;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export const FlowAnalytics = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [flowStats, setFlowStats] = useState<FlowStats | null>(null);
  const [nodeStats, setNodeStats] = useState<NodeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    if (selectedFlowId) {
      fetchFlowAnalytics();
    }
  }, [selectedFlowId]);

  const fetchFlows = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setFlows(data || []);
      if (data && data.length > 0) {
        setSelectedFlowId(data[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to load flows: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlowAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch flow execution stats
      const { data: executions, error: execError } = await supabase
        .from("flow_executions")
        .select("*")
        .eq("flow_id", selectedFlowId);

      if (execError) throw execError;

      const totalExecutions = executions?.length || 0;
      const completedExecutions = executions?.filter(e => e.status === "completed").length || 0;
      const failedExecutions = executions?.filter(e => e.status === "failed").length || 0;
      const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

      setFlowStats({
        totalExecutions,
        completedExecutions,
        failedExecutions,
        completionRate,
        avgExecutionTime: 0,
      });

      // Fetch node execution stats
      const executionIds = executions?.map(e => e.id) || [];
      
      if (executionIds.length > 0) {
        const { data: nodeExecutions, error: nodeError } = await supabase
          .from("node_executions")
          .select("*")
          .in("flow_execution_id", executionIds);

        if (nodeError) throw nodeError;

        // Aggregate node stats
        const nodeStatsMap = new Map<string, NodeStats>();
        
        nodeExecutions?.forEach((exec: any) => {
          const key = exec.node_id;
          if (!nodeStatsMap.has(key)) {
            nodeStatsMap.set(key, {
              nodeId: exec.node_id,
              nodeType: exec.node_type,
              successCount: 0,
              errorCount: 0,
              totalCount: 0,
              avgExecutionTime: 0,
            });
          }

          const stats = nodeStatsMap.get(key)!;
          stats.totalCount++;
          if (exec.status === "success") {
            stats.successCount++;
          } else {
            stats.errorCount++;
          }
          stats.avgExecutionTime = ((stats.avgExecutionTime * (stats.totalCount - 1)) + (exec.execution_time_ms || 0)) / stats.totalCount;
        });

        setNodeStats(Array.from(nodeStatsMap.values()));
      } else {
        setNodeStats([]);
      }
    } catch (error: any) {
      toast.error("Failed to load analytics: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const pieData = flowStats
    ? [
        { name: "Completed", value: flowStats.completedExecutions },
        { name: "Failed", value: flowStats.failedExecutions },
      ]
    : [];

  const nodeChartData = nodeStats.map(stat => ({
    name: `${stat.nodeType} (${stat.nodeId.substring(0, 8)})`,
    success: stat.successCount,
    error: stat.errorCount,
  }));

  if (loading && flows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No flows available. Create a flow first to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Flow Analytics</h2>
          <p className="text-muted-foreground">Track flow performance and node interactions</p>
        </div>
        <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a flow" />
          </SelectTrigger>
          <SelectContent>
            {flows.map((flow) => (
              <SelectItem key={flow.id} value={flow.id}>
                {flow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {flowStats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flowStats.totalExecutions}</div>
                <p className="text-xs text-muted-foreground">Flow triggers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flowStats.completedExecutions}</div>
                <p className="text-xs text-muted-foreground">Successful runs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flowStats.failedExecutions}</div>
                <p className="text-xs text-muted-foreground">Error runs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flowStats.completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Execution Status</CardTitle>
                <CardDescription>Distribution of completed vs failed executions</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No execution data yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Node Performance</CardTitle>
                <CardDescription>Success and error count by node</CardDescription>
              </CardHeader>
              <CardContent>
                {nodeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={nodeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="success" fill="#10b981" name="Success" />
                      <Bar dataKey="error" fill="#ef4444" name="Error" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No node execution data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {nodeStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Node Statistics</CardTitle>
                <CardDescription>Performance metrics for each node</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nodeStats.map((stat) => (
                    <div key={stat.nodeId} className="flex items-center justify-between border-b pb-4">
                      <div className="flex-1">
                        <div className="font-medium">
                          {stat.nodeType.charAt(0).toUpperCase() + stat.nodeType.slice(1)} Node
                        </div>
                        <div className="text-sm text-muted-foreground">ID: {stat.nodeId}</div>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{stat.successCount}</div>
                          <div className="text-muted-foreground">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{stat.errorCount}</div>
                          <div className="text-muted-foreground">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{stat.totalCount}</div>
                          <div className="text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{stat.avgExecutionTime.toFixed(0)}ms</div>
                          <div className="text-muted-foreground">Avg Time</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
