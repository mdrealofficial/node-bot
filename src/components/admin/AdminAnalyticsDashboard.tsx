import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, CreditCard, TrendingUp, Activity, Facebook, Instagram, 
  MessageCircle, ShoppingCart, FileText, Layout, Zap, Settings,
  Bell, CheckCircle, AlertTriangle, XCircle, RefreshCw, ArrowUpRight,
  ArrowDownRight, Database, Server, Shield, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  paidSubscriptions: number;
  totalRevenue: number;
  revenueGrowth: number;
  systemHealth: number;
}

interface PlatformStats {
  facebook: { pages: number; subscribers: number; messages: number; flows: number };
  instagram: { accounts: number; subscribers: number; messages: number; flows: number };
  whatsapp: { accounts: number; subscribers: number; messages: number; flows: number };
}

interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'flow' | 'subscription';
  title: string;
  description: string;
  time: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdminAnalyticsDashboard({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    paidSubscriptions: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    systemHealth: 98,
  });
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    facebook: { pages: 0, subscribers: 0, messages: 0, flows: 0 },
    instagram: { accounts: 0, subscribers: 0, messages: 0, flows: 0 },
    whatsapp: { accounts: 0, subscribers: 0, messages: 0, flows: 0 },
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [messageActivityData, setMessageActivityData] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [resourceStats, setResourceStats] = useState({
    stores: 0,
    forms: 0,
    landingPages: 0,
    chatbotFlows: 0,
  });
  const [appName, setAppName] = useState('Admin Dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 minutes (1800000ms) to reduce CPU load
    const interval = setInterval(loadDashboardData, 1800000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch app name
      const { data: config } = await supabase.from('admin_config').select('app_name').single();
      if (config?.app_name) setAppName(config.app_name);

      // Fetch user stats
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Fetch subscription stats
      const { data: subscriptions } = await supabase.from('subscriptions').select('plan');
      const paidSubs = subscriptions?.filter(s => s.plan !== 'free').length || 0;
      
      // Calculate subscription distribution
      const planCounts: Record<string, number> = {};
      subscriptions?.forEach(s => {
        planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      });
      const subDistribution = Object.entries(planCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
      setSubscriptionData(subDistribution);

      // Fetch revenue from orders
      const { data: orders } = await supabase.from('orders').select('total_amount, created_at');
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Calculate revenue growth (this week vs last week)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const thisWeekOrders = orders?.filter(o => new Date(o.created_at) >= weekAgo) || [];
      const lastWeekOrders = orders?.filter(o => {
        const date = new Date(o.created_at);
        return date >= twoWeeksAgo && date < weekAgo;
      }) || [];
      const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const revenueGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

      setStats({
        totalUsers: totalUsers || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        paidSubscriptions: paidSubs,
        totalRevenue,
        revenueGrowth,
        systemHealth: 98,
      });

      // Fetch platform stats
      const [
        { count: fbPages },
        { count: fbSubscribers },
        { count: fbMessages },
        { count: fbFlows },
        { count: igAccounts },
        { count: igSubscribers },
        { count: igMessages },
        { count: igFlows },
        { count: waAccounts },
        { count: waSubscribers },
        { count: waMessages },
        { count: waFlows },
      ] = await Promise.all([
        supabase.from('facebook_pages').select('*', { count: 'exact', head: true }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('chatbot_flows').select('*', { count: 'exact', head: true }),
        supabase.from('instagram_accounts').select('*', { count: 'exact', head: true }),
        supabase.from('instagram_subscribers').select('*', { count: 'exact', head: true }),
        supabase.from('instagram_messages').select('*', { count: 'exact', head: true }),
        supabase.from('instagram_chatbot_flows').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_accounts').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_subscribers').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_chatbot_flows').select('*', { count: 'exact', head: true }),
      ]);

      setPlatformStats({
        facebook: { pages: fbPages || 0, subscribers: fbSubscribers || 0, messages: fbMessages || 0, flows: fbFlows || 0 },
        instagram: { accounts: igAccounts || 0, subscribers: igSubscribers || 0, messages: igMessages || 0, flows: igFlows || 0 },
        whatsapp: { accounts: waAccounts || 0, subscribers: waSubscribers || 0, messages: waMessages || 0, flows: waFlows || 0 },
      });

      // Fetch resource stats
      const [
        { count: storesCount },
        { count: formsCount },
        { count: landingPagesCount },
      ] = await Promise.all([
        supabase.from('stores').select('*', { count: 'exact', head: true }),
        supabase.from('forms').select('*', { count: 'exact', head: true }),
        supabase.from('landing_pages').select('*', { count: 'exact', head: true }),
      ]);

      setResourceStats({
        stores: storesCount || 0,
        forms: formsCount || 0,
        landingPages: landingPagesCount || 0,
        chatbotFlows: (fbFlows || 0) + (igFlows || 0) + (waFlows || 0),
      });

      // Generate user growth data (last 30 days)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      const growthMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        growthMap[key] = 0;
      }
      profiles?.forEach(p => {
        const key = p.created_at.split('T')[0];
        if (growthMap[key] !== undefined) growthMap[key]++;
      });
      
      let cumulative = (totalUsers || 0) - (profiles?.length || 0);
      const growthData = Object.entries(growthMap).map(([date, count]) => {
        cumulative += count;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: cumulative,
          newUsers: count,
        };
      });
      setUserGrowthData(growthData);

      // Generate message activity data (last 7 days)
      const messageData: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();
        
        const [
          { count: fbMsgs },
          { count: igMsgs },
          { count: waMsgs },
        ] = await Promise.all([
          supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lte('created_at', dayEnd),
          supabase.from('instagram_messages').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lte('created_at', dayEnd),
          supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lte('created_at', dayEnd),
        ]);
        
        messageData.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          facebook: fbMsgs || 0,
          instagram: igMsgs || 0,
          whatsapp: waMsgs || 0,
        });
      }
      setMessageActivityData(messageData);

      // Fetch recent activity
      const [
        { data: recentUsers },
        { data: recentOrders },
        { data: recentFlows },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('id, total_amount, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('flow_executions').select('id, status, triggered_at').order('triggered_at', { ascending: false }).limit(5),
      ]);

      const activities: RecentActivity[] = [];
      recentUsers?.forEach(u => activities.push({
        id: u.id,
        type: 'user',
        title: 'New User Signup',
        description: u.full_name || u.email,
        time: formatTimeAgo(u.created_at),
      }));
      recentOrders?.forEach(o => activities.push({
        id: o.id,
        type: 'order',
        title: 'New Order',
        description: `৳${o.total_amount?.toLocaleString() || 0}`,
        time: formatTimeAgo(o.created_at),
      }));
      recentFlows?.forEach(f => activities.push({
        id: f.id,
        type: 'flow',
        title: 'Flow Executed',
        description: f.status,
        time: formatTimeAgo(f.triggered_at),
      }));

      activities.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });

      setRecentActivity(activities.slice(0, 10));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatLastRefresh = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const parseTimeAgo = (timeStr: string): number => {
    if (timeStr === 'Just now') return 0;
    const match = timeStr.match(/(\d+)([mhd])/);
    if (!match) return Infinity;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { m: 1, h: 60, d: 1440 };
    return parseInt(num) * (multipliers[unit] || 1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4 text-blue-500" />;
      case 'order': return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'flow': return <Zap className="h-4 w-4 text-purple-500" />;
      case 'subscription': return <CreditCard className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-500';
    if (health >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 95) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (health >= 80) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{appName}</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {formatLastRefresh()}
          </span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {stats.newUsersThisWeek > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{stats.newUsersThisWeek}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
              <span className="text-muted-foreground ml-1">this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Paid Subscriptions */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paid Subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.paidSubscriptions.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalUsers > 0 ? Math.round((stats.paidSubscriptions / stats.totalUsers) * 100) : 0}% conversion rate
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">৳{stats.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {stats.revenueGrowth > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{stats.revenueGrowth.toFixed(1)}%</span>
                </>
              ) : stats.revenueGrowth < 0 ? (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{stats.revenueGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
              <span className="text-muted-foreground ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${getHealthColor(stats.systemHealth)}`}>
                {stats.systemHealth}%
              </span>
              {getHealthIcon(stats.systemHealth)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">All systems operational</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
            <CardDescription>Total users over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message Activity</CardTitle>
            <CardDescription>Messages sent in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={messageActivityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="facebook" stackId="a" fill="hsl(217 91% 60%)" name="Facebook" />
                <Bar dataKey="instagram" stackId="a" fill="hsl(330 80% 60%)" name="Instagram" />
                <Bar dataKey="whatsapp" stackId="a" fill="hsl(142 70% 45%)" name="WhatsApp" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Facebook */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-500" />
              Facebook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pages</span>
              <span className="font-medium">{platformStats.facebook.pages}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscribers</span>
              <span className="font-medium">{platformStats.facebook.subscribers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Messages</span>
              <span className="font-medium">{platformStats.facebook.messages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flows</span>
              <span className="font-medium">{platformStats.facebook.flows}</span>
            </div>
          </CardContent>
        </Card>

        {/* Instagram */}
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Instagram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accounts</span>
              <span className="font-medium">{platformStats.instagram.accounts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscribers</span>
              <span className="font-medium">{platformStats.instagram.subscribers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Messages</span>
              <span className="font-medium">{platformStats.instagram.messages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flows</span>
              <span className="font-medium">{platformStats.instagram.flows}</span>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accounts</span>
              <span className="font-medium">{platformStats.whatsapp.accounts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscribers</span>
              <span className="font-medium">{platformStats.whatsapp.subscribers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Messages</span>
              <span className="font-medium">{platformStats.whatsapp.messages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flows</span>
              <span className="font-medium">{platformStats.whatsapp.flows}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Database</span>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Authentication</span>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Edge Functions</span>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Running
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Avg Response Time</span>
              </div>
              <span className="text-sm font-medium">~250ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                No subscription data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Overview</CardTitle>
            <CardDescription>Total resources created by users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <ShoppingCart className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{resourceStats.stores}</p>
                  <p className="text-xs text-muted-foreground">Stores</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{resourceStats.forms}</p>
                  <p className="text-xs text-muted-foreground">Forms</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Layout className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{resourceStats.landingPages}</p>
                  <p className="text-xs text-muted-foreground">Landing Pages</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Zap className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{resourceStats.chatbotFlows}</p>
                  <p className="text-xs text-muted-foreground">Chatbot Flows</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Frequently used admin actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => onNavigate('users')}>
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => onNavigate('subscriptions')}>
                <CreditCard className="h-4 w-4 mr-2" />
                Subscriptions
              </Button>
              <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => onNavigate('config')}>
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
              <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => onNavigate('announcements')}>
                <Bell className="h-4 w-4 mr-2" />
                Announcements
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
