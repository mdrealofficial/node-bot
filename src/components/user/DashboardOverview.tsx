import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Users, Zap, MessageSquare, ShoppingCart, 
  Activity, Target, DollarSign
} from 'lucide-react';
import { formatPrice } from '@/lib/currencyUtils';

interface DashboardStats {
  totalFlows: number;
  activeFlows: number;
  totalSubscribers: number;
  totalExecutions: number;
  totalMessages: number;
  totalOrders: number;
  revenueTotal: number;
  flowsChange: number;
  subscribersChange: number;
  executionsChange: number;
}

interface FlowPerformance {
  name: string;
  executions: number;
  successRate: number;
}

interface TimeSeriesData {
  date: string;
  executions: number;
  subscribers: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--foreground))'];

export const DashboardOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalFlows: 0,
    activeFlows: 0,
    totalSubscribers: 0,
    totalExecutions: 0,
    totalMessages: 0,
    totalOrders: 0,
    revenueTotal: 0,
    flowsChange: 0,
    subscribersChange: 0,
    executionsChange: 0,
  });
  const [flowPerformance, setFlowPerformance] = useState<FlowPerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [pageDistribution, setPageDistribution] = useState<any[]>([]);
  const [storeCurrency, setStoreCurrency] = useState<string>('BDT');

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // First check if user has a store
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, currency')
        .eq('user_id', user!.id)
        .maybeSingle();

      const storeCurrency = storeData?.currency || 'BDT';

      // Fetch basic stats
      const [flowsData, subscribersData, executionsData, messagesData, ordersData, pagesData] = await Promise.all([
        supabase.from('chatbot_flows').select('id, is_active').eq('user_id', user!.id),
        supabase.from('subscribers').select('id, created_at').eq('user_id', user!.id),
        supabase.from('flow_executions').select('id, triggered_at, status').eq('user_id', user!.id),
        supabase.from('messages').select('id').eq('sender_type', 'page'),
        // Only fetch orders if user has a store
        storeData 
          ? supabase.from('orders').select('total_amount, created_at').eq('store_id', storeData.id)
          : Promise.resolve({ data: null, error: null }),
        supabase.from('facebook_pages').select('id, page_name').eq('user_id', user!.id)
      ]);

      // Calculate stats
      const totalFlows = flowsData.data?.length || 0;
      const activeFlows = flowsData.data?.filter(f => f.is_active).length || 0;
      const totalSubscribers = subscribersData.data?.length || 0;
      const totalExecutions = executionsData.data?.length || 0;
      const totalMessages = messagesData.data?.length || 0;
      const totalOrders = ordersData?.data?.length || 0;
      const revenueTotal = ordersData?.data?.reduce((sum: number, order: any) => sum + Number(order.total_amount), 0) || 0;

      // Calculate changes (last 7 days vs previous 7 days)
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const recentSubscribers = subscribersData.data?.filter(s => new Date(s.created_at) > last7Days).length || 0;
      const previousSubscribers = subscribersData.data?.filter(s => {
        const date = new Date(s.created_at);
        return date > previous7Days && date <= last7Days;
      }).length || 0;
      
      const recentExecutions = executionsData.data?.filter(e => new Date(e.triggered_at) > last7Days).length || 0;
      const previousExecutions = executionsData.data?.filter(e => {
        const date = new Date(e.triggered_at);
        return date > previous7Days && date <= last7Days;
      }).length || 0;

      setStats({
        totalFlows,
        activeFlows,
        totalSubscribers,
        totalExecutions,
        totalMessages,
        totalOrders,
        revenueTotal,
        flowsChange: 0,
        subscribersChange: previousSubscribers > 0 ? ((recentSubscribers - previousSubscribers) / previousSubscribers) * 100 : 0,
        executionsChange: previousExecutions > 0 ? ((recentExecutions - previousExecutions) / previousExecutions) * 100 : 0,
      });

      // Fetch flow performance
      const flowsWithExecutions = await Promise.all(
        (flowsData.data || []).slice(0, 5).map(async (flow) => {
          const { data: executions } = await supabase
            .from('flow_executions')
            .select('id, status')
            .eq('flow_id', flow.id);
          
          const { data: flowDetails } = await supabase
            .from('chatbot_flows')
            .select('name')
            .eq('id', flow.id)
            .single();

          const total = executions?.length || 0;
          const successful = executions?.filter(e => e.status === 'completed').length || 0;

          return {
            name: flowDetails?.name || 'Unnamed Flow',
            executions: total,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 0
          };
        })
      );

      setFlowPerformance(flowsWithExecutions.filter(f => f.executions > 0));

      // Generate time series data (last 7 days)
      const timeData: TimeSeriesData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const dayExecutions = executionsData.data?.filter(e => {
          const execDate = new Date(e.triggered_at);
          return execDate.toDateString() === date.toDateString();
        }).length || 0;

        const daySubscribers = subscribersData.data?.filter(s => {
          const subDate = new Date(s.created_at);
          return subDate.toDateString() === date.toDateString();
        }).length || 0;

        timeData.push({
          date: dateStr,
          executions: dayExecutions,
          subscribers: daySubscribers
        });
      }

      setTimeSeriesData(timeData);

      // Calculate page distribution
      const distribution = await Promise.all(
        (pagesData.data || []).map(async (page) => {
          const { count } = await supabase
            .from('subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('page_id', page.id);

          return {
            name: page.page_name,
            value: count || 0
          };
        })
      );

      setPageDistribution(distribution.filter(d => d.value > 0));
      setStoreCurrency(storeCurrency);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalFlows}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeFlows} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalSubscribers}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {stats.subscribersChange >= 0 ? (
                <span className="text-xs text-muted-foreground">
                  +{stats.subscribersChange.toFixed(1)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {stats.subscribersChange.toFixed(1)}% vs last week
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flow Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalExecutions}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {stats.executionsChange >= 0 ? (
                <span className="text-xs text-muted-foreground">
                  +{stats.executionsChange.toFixed(1)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {stats.executionsChange.toFixed(1)}% vs last week
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPrice(stats.revenueTotal, storeCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalOrders} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalMessages}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total delivered
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalFlows > 0 ? Math.round((stats.activeFlows / stats.totalFlows) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Flows currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.totalOrders > 0 ? stats.revenueTotal / stats.totalOrders : 0, storeCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per order
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSubscribers > 0 && stats.totalOrders > 0 
                ? ((stats.totalOrders / stats.totalSubscribers) * 100).toFixed(1) 
                : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Subscriber to order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Activity Trend</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="executions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExecutions)"
                  name="Executions"
                />
                <Area 
                  type="monotone" 
                  dataKey="subscribers" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSubscribers)"
                  name="New Subscribers"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Flow Performance</CardTitle>
            <CardDescription>Top flows by execution count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flowPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="executions" fill="hsl(var(--primary))" name="Executions" radius={[4, 4, 0, 0]} />
                <Bar dataKey="successRate" fill="hsl(var(--muted-foreground))" name="Success Rate %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {pageDistribution.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Subscriber Distribution</CardTitle>
              <CardDescription>Spread across your pages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {pageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {flowPerformance.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Success Rate Analysis</CardTitle>
              <CardDescription>Flow performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flowPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    className="text-xs"
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="successRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
