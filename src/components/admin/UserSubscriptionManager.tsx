import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Subscription {
  user_id: string;
  plan: string;
  replies_quota: number;
  replies_used: number;
  quota_reset_at: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionPlan {
  plan_name: string;
  monthly_price: number;
  replies_quota: number;
  max_connected_pages: number;
  max_instagram_accounts: number;
  max_flows: number;
}

interface UserSubscriptionData extends User {
  subscription: Subscription | null;
}

export function UserSubscriptionManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserSubscriptionData[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserSubscriptionData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Form state
  const [selectedPlan, setSelectedPlan] = useState('');
  const [customQuota, setCustomQuota] = useState('');
  const [customResetDate, setCustomResetDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch all plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch all users with their subscriptions
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch subscriptions for all users
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // Merge data
      const usersWithSubs: UserSubscriptionData[] = (profilesData || []).map(profile => ({
        ...profile,
        subscription: subscriptionsData?.find(sub => sub.user_id === profile.id) || null
      }));

      setUsers(usersWithSubs);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: UserSubscriptionData) => {
    setEditingUser(user);
    setSelectedPlan(user.subscription?.plan || 'free');
    setCustomQuota(user.subscription?.replies_quota?.toString() || '');
    setCustomResetDate(
      user.subscription?.quota_reset_at 
        ? new Date(user.subscription.quota_reset_at).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setEditDialogOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!editingUser) return;

    try {
      const selectedPlanData = plans.find(p => p.plan_name === selectedPlan);
      
      const updateData: any = {
        plan: selectedPlan,
        replies_quota: customQuota ? parseInt(customQuota) : (selectedPlanData?.replies_quota || 100),
        quota_reset_at: customResetDate ? new Date(customResetDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('user_id', editingUser.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Subscription updated for ${editingUser.email}`,
      });

      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  };

  const handleResetUsage = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          replies_used: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Usage reset successfully',
      });

      loadData();
    } catch (error) {
      console.error('Error resetting usage:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset usage',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'pro': return 'default';
      case 'creator': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Subscription Management</CardTitle>
          <CardDescription>
            Manage user subscription plans and quotas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={loadData}>
                Refresh
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Reset Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const sub = user.subscription;
                    const usagePercent = sub ? (sub.replies_used / sub.replies_quota) * 100 : 0;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPlanBadgeVariant(sub?.plan || 'free')} className="capitalize">
                            {sub?.plan || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-secondary rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  usagePercent > 90 ? "bg-destructive" : usagePercent > 75 ? "bg-warning" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(usagePercent)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {sub?.replies_used?.toLocaleString() || 0} / {sub?.replies_quota?.toLocaleString() || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {sub?.quota_reset_at 
                              ? new Date(sub.quota_reset_at).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClick(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetUsage(user.id)}
                              disabled={!sub || sub.replies_used === 0}
                            >
                              Reset
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription plan and limits for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.plan_name} value={plan.plan_name} className="capitalize">
                      {plan.plan_name} - ${plan.monthly_price}/mo ({plan.replies_quota.toLocaleString()} msgs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Custom Message Quota (optional)</Label>
              <Input
                type="number"
                placeholder="Leave empty to use plan default"
                value={customQuota}
                onChange={(e) => setCustomQuota(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Plan default: {plans.find(p => p.plan_name === selectedPlan)?.replies_quota.toLocaleString() || '0'} messages
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quota Reset Date</Label>
              <Input
                type="date"
                value={customResetDate}
                onChange={(e) => setCustomResetDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSubscription}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
