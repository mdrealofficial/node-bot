import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Plus } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencyUtils';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  monthly_price: number;
  replies_quota: number;
  max_connected_pages: number;
  max_instagram_accounts: number;
  max_tiktok_accounts: number;
  max_flows: number;
  max_broadcast_recipients: number;
  features: any;
  is_active: boolean;
  display_order: number;
}

export function SubscriptionPlanManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [adminCurrency, setAdminCurrency] = useState('USD');

  // Form state
  const [formData, setFormData] = useState({
    plan_name: '',
    monthly_price: 0,
    replies_quota: 0,
    max_connected_pages: 0,
    max_instagram_accounts: 0,
    max_tiktok_accounts: 0,
    max_flows: 0,
    max_broadcast_recipients: 0,
    is_active: true,
    display_order: 0,
    features: {
      advanced_analytics: false,
      priority_support: false,
      custom_templates: false,
      api_access: false,
      white_label: false,
      ai_assistant: false,
    }
  });

  useEffect(() => {
    loadPlans();
    loadAdminCurrency();
  }, []);

  const loadAdminCurrency = async () => {
    try {
      const { data } = await supabase
        .from('admin_config')
        .select('default_currency')
        .single();
      if (data?.default_currency) {
        setAdminCurrency(data.default_currency);
      }
    } catch (error) {
      console.error('Error loading admin currency:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsCreating(false);
    setFormData({
      plan_name: plan.plan_name,
      monthly_price: plan.monthly_price,
      replies_quota: plan.replies_quota,
      max_connected_pages: plan.max_connected_pages,
      max_instagram_accounts: plan.max_instagram_accounts,
      max_tiktok_accounts: plan.max_tiktok_accounts,
      max_flows: plan.max_flows,
      max_broadcast_recipients: plan.max_broadcast_recipients,
      is_active: plan.is_active,
      display_order: plan.display_order,
      features: plan.features || {
        advanced_analytics: false,
        priority_support: false,
        custom_templates: false,
        api_access: false,
        white_label: false,
        ai_assistant: false,
      }
    });
    setEditDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingPlan(null);
    setIsCreating(true);
    setFormData({
      plan_name: '',
      monthly_price: 0,
      replies_quota: 0,
      max_connected_pages: 0,
      max_instagram_accounts: 0,
      max_tiktok_accounts: 0,
      max_flows: 0,
      max_broadcast_recipients: 0,
      is_active: true,
      display_order: plans.length,
      features: {
        advanced_analytics: false,
        priority_support: false,
        custom_templates: false,
        api_access: false,
        white_label: false,
        ai_assistant: false,
      }
    });
    setEditDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (isCreating) {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Subscription plan created successfully',
        });
      } else if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(formData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Subscription plan updated successfully',
        });
      }

      setEditDialogOpen(false);
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subscription plan',
        variant: 'destructive',
      });
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Plan ${!plan.is_active ? 'enabled' : 'disabled'} successfully`,
      });

      loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan status',
        variant: 'destructive',
      });
    }
  };

  const currencySymbol = getCurrencySymbol(adminCurrency);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                Manage subscription plans, pricing, and features. Currency: {adminCurrency} ({currencySymbol})
              </CardDescription>
            </div>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Flows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium capitalize">{plan.plan_name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{currencySymbol}{plan.monthly_price}</span>/mo
                    </TableCell>
                    <TableCell>{plan.replies_quota.toLocaleString()}</TableCell>
                    <TableCell>{plan.max_connected_pages === 999999 ? 'Unlimited' : plan.max_connected_pages}</TableCell>
                    <TableCell>{plan.max_instagram_accounts === 999999 ? 'Unlimited' : plan.max_instagram_accounts}</TableCell>
                    <TableCell>{plan.max_flows === 999999 ? 'Unlimited' : plan.max_flows}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={plan.is_active ? 'ghost' : 'default'}
                          onClick={() => togglePlanStatus(plan)}
                        >
                          {plan.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No plans found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create' : 'Edit'} Subscription Plan</DialogTitle>
            <DialogDescription>
              {isCreating ? 'Create a new subscription plan' : `Editing ${editingPlan?.plan_name} plan`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g., Pro"
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly Price ({currencySymbol})</Label>
                <Input
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Messages Quota</Label>
                <Input
                  type="number"
                  value={formData.replies_quota}
                  onChange={(e) => setFormData({ ...formData, replies_quota: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Facebook Pages</Label>
                <Input
                  type="number"
                  value={formData.max_connected_pages}
                  onChange={(e) => setFormData({ ...formData, max_connected_pages: parseInt(e.target.value) })}
                  placeholder="999999 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Instagram Accounts</Label>
                <Input
                  type="number"
                  value={formData.max_instagram_accounts}
                  onChange={(e) => setFormData({ ...formData, max_instagram_accounts: parseInt(e.target.value) })}
                  placeholder="999999 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Max TikTok Accounts</Label>
                <Input
                  type="number"
                  value={formData.max_tiktok_accounts}
                  onChange={(e) => setFormData({ ...formData, max_tiktok_accounts: parseInt(e.target.value) })}
                  placeholder="999999 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Chatbot Flows</Label>
                <Input
                  type="number"
                  value={formData.max_flows}
                  onChange={(e) => setFormData({ ...formData, max_flows: parseInt(e.target.value) })}
                  placeholder="999999 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Broadcast Recipients</Label>
                <Input
                  type="number"
                  value={formData.max_broadcast_recipients}
                  onChange={(e) => setFormData({ ...formData, max_broadcast_recipients: parseInt(e.target.value) })}
                  placeholder="999999 for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2 flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active Plan</Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Features</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(formData.features).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          features: { ...formData.features, [key]: checked }
                        })
                      }
                    />
                    <Label className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePlan}>
                {isCreating ? 'Create' : 'Save'} Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}