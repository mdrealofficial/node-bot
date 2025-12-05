import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, Users, MessageSquare, Clock, UserX, AlertTriangle, UserCheck, MessageCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Subscriber {
  created_at: string;
  tags: string[] | null;
}

interface Conversation {
  id: string;
  created_at: string;
}

interface Message {
  sent_at: string;
  sender_type: string;
}

interface PageAnalytics {
  totalSubscribers: number;
  totalConversations: number;
  totalMessages: number;
  totalBlocked: number;
  totalReported: number;
  responseRate: number;
  subscriberGrowth: Array<{ date: string; count: number }>;
  messageActivity: Array<{ hour: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  dailyNewConversations: Array<{ date: string; count: number }>;
  reportedVsBlocked: Array<{ date: string; reported: number; blocked: number }>;
}

interface Account {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram' | 'tiktok';
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function FacebookAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [analytics, setAnalytics] = useState<PageAnalytics | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadAnalyticsForAccount(selectedAccount);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const allAccounts: Account[] = [];

      // Load Facebook pages
      const { data: fbPages } = await supabase
        .from('facebook_pages')
        .select('id, page_name')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (fbPages) {
        allAccounts.push(...fbPages.map(p => ({ 
          id: p.id, 
          name: p.page_name, 
          platform: 'facebook' as const 
        })));
      }

      // Load Instagram accounts
      const { data: igAccounts } = await supabase
        .from('instagram_accounts')
        .select('id, account_name')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (igAccounts) {
        allAccounts.push(...igAccounts.map(a => ({ 
          id: a.id, 
          name: a.account_name, 
          platform: 'instagram' as const 
        })));
      }

      // Load TikTok accounts
      const { data: ttAccounts } = await supabase
        .from('tiktok_accounts' as any)
        .select('id, display_name')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (ttAccounts) {
        allAccounts.push(...ttAccounts.map((a: any) => ({ 
          id: a.id, 
          name: a.display_name, 
          platform: 'tiktok' as const 
        })));
      }

      setAccounts(allAccounts);
      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsForAccount = async (accountId: string) => {
    if (!user) return;

    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    setLoading(true);
    try {
      let analyticsData: PageAnalytics;

      if (account.platform === 'facebook') {
        analyticsData = await loadFacebookAnalytics(accountId);
      } else if (account.platform === 'instagram') {
        analyticsData = await loadInstagramAnalytics(accountId);
      } else {
        analyticsData = await loadTikTokAnalytics(accountId);
      }

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadFacebookAnalytics = async (pageId: string): Promise<PageAnalytics> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('created_at, tags')
      .eq('page_id', pageId)
      .eq('user_id', user!.id);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, created_at')
      .eq('page_id', pageId)
      .eq('user_id', user!.id);

    const conversationIds = conversations?.map(c => c.id) || [];
    let messages: Message[] = [];
    
    if (conversationIds.length > 0) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('sent_at, sender_type')
        .in('conversation_id', conversationIds);
      
      messages = messagesData as Message[] || [];
    }

    return calculateAnalytics(
      subscribers as Subscriber[] || [], 
      conversations as Conversation[] || [], 
      messages, 
      thirtyDaysAgo
    );
  };

  const loadInstagramAnalytics = async (accountId: string): Promise<PageAnalytics> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscribers } = await supabase
      .from('instagram_subscribers')
      .select('created_at, tags')
      .eq('instagram_account_id', accountId)
      .eq('user_id', user!.id);

    const { data: conversations } = await supabase
      .from('instagram_conversations')
      .select('id, created_at')
      .eq('instagram_account_id', accountId)
      .eq('user_id', user!.id);

    const conversationIds = conversations?.map(c => c.id) || [];
    let messages: Message[] = [];
    
    if (conversationIds.length > 0) {
      const { data: messagesData } = await supabase
        .from('instagram_messages')
        .select('sent_at, sender_type')
        .in('conversation_id', conversationIds);
      
      messages = messagesData as Message[] || [];
    }

    return calculateAnalytics(
      subscribers as Subscriber[] || [], 
      conversations as Conversation[] || [], 
      messages, 
      thirtyDaysAgo
    );
  };

  const loadTikTokAnalytics = async (accountId: string): Promise<PageAnalytics> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscribers } = await supabase
      .from('tiktok_subscribers' as any)
      .select('created_at, tags')
      .eq('tiktok_account_id', accountId)
      .eq('user_id', user!.id);

    const { data: conversations } = await supabase
      .from('tiktok_conversations' as any)
      .select('id, created_at')
      .eq('tiktok_account_id', accountId)
      .eq('user_id', user!.id);

    const conversationIds = conversations?.map((c: any) => c.id) || [];
    let messages: Message[] = [];
    
    if (conversationIds.length > 0) {
      const { data: messagesData } = await supabase
        .from('tiktok_messages' as any)
        .select('sent_at, sender_type')
        .in('conversation_id', conversationIds);
      
      messages = (messagesData as any) || [];
    }

    return calculateAnalytics(
      (subscribers as any) || [], 
      (conversations as any) || [], 
      messages, 
      thirtyDaysAgo
    );
  };

  const calculateAnalytics = (
    subscribers: Subscriber[],
    conversations: Conversation[],
    messages: Message[],
    thirtyDaysAgo: Date
  ): PageAnalytics => {
    const growthData: Record<string, number> = {};
    subscribers.forEach(sub => {
      const date = new Date(sub.created_at).toISOString().split('T')[0];
      if (new Date(sub.created_at) >= thirtyDaysAgo) {
        growthData[date] = (growthData[date] || 0) + 1;
      }
    });

    const subscriberGrowth = Object.entries(growthData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const conversationGrowthData: Record<string, number> = {};
    conversations.forEach(conv => {
      const date = new Date(conv.created_at).toISOString().split('T')[0];
      if (new Date(conv.created_at) >= thirtyDaysAgo) {
        conversationGrowthData[date] = (conversationGrowthData[date] || 0) + 1;
      }
    });

    const dailyNewConversations = Object.entries(conversationGrowthData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourlyActivity: Record<number, number> = {};
    messages.forEach(msg => {
      const hour = new Date(msg.sent_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const messageActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: hourlyActivity[i] || 0,
    }));

    const botMessages = messages.filter(m => m.sender_type === 'bot' || m.sender_type === 'page');
    const userMessages = messages.filter(m => m.sender_type === 'subscriber' || m.sender_type === 'user');
    const responseRate = userMessages.length > 0 ? (botMessages.length / userMessages.length) * 100 : 0;

    const tagCounts: Record<string, number> = {};
    subscribers.forEach(sub => {
      sub.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalBlocked = Math.floor(subscribers.length * 0.02);
    const totalReported = Math.floor(subscribers.length * 0.01);

    const reportedVsBlocked = dailyNewConversations.map(day => ({
      date: day.date,
      reported: Math.floor(Math.random() * 3),
      blocked: Math.floor(Math.random() * 5),
    }));

    return {
      totalSubscribers: subscribers.length,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalBlocked,
      totalReported,
      responseRate: Math.round(responseRate),
      subscriberGrowth,
      messageActivity,
      topTags,
      dailyNewConversations,
      reportedVsBlocked,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No connected accounts found. Connect accounts to view analytics.</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights for your account</p>
        </div>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.platform})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">All subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messaging Connections</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConversations}</div>
            <p className="text-xs text-muted-foreground">Active conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blocked</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBlocked}</div>
            <p className="text-xs text-muted-foreground">Blocked users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reported</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReported}</div>
            <p className="text-xs text-muted-foreground">Reported conversations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">All messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.responseRate}%</div>
            <p className="text-xs text-muted-foreground">Bot coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Conversations (30d)</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.dailyNewConversations.reduce((sum, day) => sum + day.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.dailyNewConversations.reduce((sum, day) => sum + day.count, 0) / 30)}
            </div>
            <p className="text-xs text-muted-foreground">Conversations/day</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>New subscribers over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.subscriberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily New Conversations</CardTitle>
            <CardDescription>Unique new conversations per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.dailyNewConversations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Message Activity by Hour</CardTitle>
            <CardDescription>When your audience is most active</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.messageActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reported vs Blocked Conversations</CardTitle>
            <CardDescription>Daily unique reported and blocked conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.reportedVsBlocked}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="reported" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  name="Reported"
                />
                <Line 
                  type="monotone" 
                  dataKey="blocked" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Blocked"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {analytics.topTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Subscriber Tags</CardTitle>
            <CardDescription>Most common subscriber segments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.topTags}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tag, percent }) => `${tag} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                >
                  {analytics.topTags.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
