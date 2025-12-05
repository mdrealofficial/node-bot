import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, CreditCard, Settings, Shield } from 'lucide-react';

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    role?: string;
  };
  onUpdate: () => void;
}

interface UserProfile {
  phone_number: string | null;
  full_name: string | null;
}

interface UserSubscription {
  plan: string;
  replies_quota: number;
  replies_used: number;
  topup_credits_remaining: number;
}

interface SidebarSettings {
  sidebar_pages: boolean;
  sidebar_flow: boolean;
  sidebar_subscribers: boolean;
  sidebar_broadcast: boolean;
  sidebar_chat: boolean;
  sidebar_templates: boolean;
  sidebar_comment_replies: boolean;
  sidebar_store: boolean;
  sidebar_subscription: boolean;
  sidebar_analysis: boolean;
}

const SUBSCRIPTION_PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial' },
  { value: 'starter', label: 'Starter' },
  { value: 'creator', label: 'Creator' },
  { value: 'pro', label: 'Pro' },
];

const USER_ROLES = [
  { value: 'user', label: 'User', description: 'Standard user access', color: 'bg-gray-500' },
  { value: 'beta_user', label: 'Beta User', description: 'Access to beta features', color: 'bg-blue-500' },
  { value: 'test_user', label: 'Test User', description: 'For testing purposes', color: 'bg-yellow-500' },
  { value: 'staff', label: 'Staff', description: 'Staff member access', color: 'bg-purple-500' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access', color: 'bg-red-500' },
];

const MENU_ITEMS: { id: keyof SidebarSettings; label: string }[] = [
  { id: 'sidebar_pages', label: 'Pages' },
  { id: 'sidebar_flow', label: 'Flow Builder' },
  { id: 'sidebar_subscribers', label: 'Subscribers' },
  { id: 'sidebar_broadcast', label: 'Broadcast' },
  { id: 'sidebar_chat', label: 'Live Chat' },
  { id: 'sidebar_templates', label: 'Templates' },
  { id: 'sidebar_comment_replies', label: 'Comment Replies' },
  { id: 'sidebar_store', label: 'Store' },
  { id: 'sidebar_subscription', label: 'Subscription' },
  { id: 'sidebar_analysis', label: 'Analysis' },
];

const defaultSidebarSettings: SidebarSettings = {
  sidebar_pages: true,
  sidebar_flow: true,
  sidebar_subscribers: true,
  sidebar_broadcast: true,
  sidebar_chat: true,
  sidebar_templates: true,
  sidebar_comment_replies: true,
  sidebar_store: true,
  sidebar_subscription: true,
  sidebar_analysis: true,
};

export const UserManagementDialog = ({ open, onOpenChange, user, onUpdate }: UserManagementDialogProps) => {
  const [newEmail, setNewEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({ phone_number: null, full_name: null });
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newFullName, setNewFullName] = useState('');

  // Role state
  const [currentRole, setCurrentRole] = useState(user.role || 'user');
  const [selectedRole, setSelectedRole] = useState(user.role || 'user');

  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription>({
    plan: 'free',
    replies_quota: 100,
    replies_used: 0,
    topup_credits_remaining: 0,
  });
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [addCredits, setAddCredits] = useState('');
  const [addTopupCredits, setAddTopupCredits] = useState('');

  // Sidebar settings state
  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>(defaultSidebarSettings);

  useEffect(() => {
    if (open) {
      setNewEmail(user.email);
      loadUserData();
    }
  }, [open, user.id]);

  const loadUserData = async () => {
    setLoadingData(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setNewPhoneNumber(profileData.phone_number || '');
        setNewFullName(profileData.full_name || '');
      }

      // Load role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData) {
        setCurrentRole(roleData.role);
        setSelectedRole(roleData.role);
      } else {
        setCurrentRole('user');
        setSelectedRole('user');
      }

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan, replies_quota, replies_used, topup_credits_remaining')
        .eq('user_id', user.id)
        .single();

      if (subData) {
        setSubscription(subData as UserSubscription);
        setSelectedPlan(subData.plan);
      }

      // Load user settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('sidebar_pages, sidebar_flow, sidebar_subscribers, sidebar_broadcast, sidebar_chat, sidebar_templates, sidebar_comment_replies, sidebar_store, sidebar_subscription, sidebar_analysis')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setSidebarSettings({
          sidebar_pages: settingsData.sidebar_pages ?? true,
          sidebar_flow: settingsData.sidebar_flow ?? true,
          sidebar_subscribers: settingsData.sidebar_subscribers ?? true,
          sidebar_broadcast: settingsData.sidebar_broadcast ?? true,
          sidebar_chat: settingsData.sidebar_chat ?? true,
          sidebar_templates: settingsData.sidebar_templates ?? true,
          sidebar_comment_replies: settingsData.sidebar_comment_replies ?? true,
          sidebar_store: settingsData.sidebar_store ?? true,
          sidebar_subscription: settingsData.sidebar_subscription ?? true,
          sidebar_analysis: settingsData.sidebar_analysis ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const makeAdminRequest = async (body: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user.email) {
      toast({ title: 'No changes', description: 'Please enter a different email address', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await makeAdminRequest({ userId: user.id, action: 'update', email: newEmail });
      toast({ title: 'Email updated', description: `Email changed to ${newEmail}` });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Invalid password', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await makeAdminRequest({ userId: user.id, action: 'update', password: newPassword });
      toast({ title: 'Password reset', description: 'User password has been updated' });
      setNewPassword('');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-profile',
        phoneNumber: newPhoneNumber,
        fullName: newFullName,
      });
      toast({ title: 'Profile updated', description: 'User profile has been updated' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (selectedRole === currentRole) {
      toast({ title: 'No changes', description: 'Please select a different role', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-role',
        role: selectedRole,
      });
      toast({ title: 'Role updated', description: `User role changed to ${selectedRole}` });
      setCurrentRole(selectedRole);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanChange = async () => {
    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-plan',
        plan: selectedPlan,
      });
      toast({ title: 'Plan updated', description: `User plan changed to ${selectedPlan}` });
      loadUserData();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredits = async () => {
    const credits = parseInt(addCredits);
    if (isNaN(credits) || credits <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-credits',
        addRepliesQuota: credits,
      });
      toast({ title: 'Credits added', description: `Added ${credits} reply credits` });
      setAddCredits('');
      loadUserData();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTopupCredits = async () => {
    const credits = parseInt(addTopupCredits);
    if (isNaN(credits) || credits <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-credits',
        addTopupCredits: credits,
      });
      toast({ title: 'Topup credits added', description: `Added ${credits} topup credits` });
      setAddTopupCredits('');
      loadUserData();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetUsage = async () => {
    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-credits',
        resetUsage: true,
      });
      toast({ title: 'Usage reset', description: 'User usage has been reset to 0' });
      loadUserData();
    } catch (error: any) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeature = (featureId: keyof SidebarSettings) => {
    setSidebarSettings(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const handleSaveFeatures = async () => {
    setIsLoading(true);
    try {
      await makeAdminRequest({
        userId: user.id,
        action: 'update-features',
        sidebarSettings: sidebarSettings,
      });
      toast({ title: 'Features updated', description: 'User feature access has been updated' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = USER_ROLES.find(r => r.value === role);
    return (
      <Badge className={`${roleConfig?.color || 'bg-gray-500'} text-white`}>
        {roleConfig?.label || role}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User Account</DialogTitle>
          <DialogDescription>
            Manage account for {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="account" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Account
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="role" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Role
              </TabsTrigger>
              <TabsTrigger value="subscription" className="text-xs">
                <CreditCard className="h-3 w-3 mr-1" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="features" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Features
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-6 mt-4">
              <form onSubmit={handleEmailChange} className="space-y-4">
                <h4 className="font-medium text-sm">Change Email</h4>
                <div className="space-y-2">
                  <Label htmlFor="email">New Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Email
                </Button>
              </form>

              <div className="border-t pt-4">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <h4 className="font-medium text-sm">Reset Password</h4>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Reset Password
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+8801XXXXXXXXX"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Profile
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="role" className="space-y-4 mt-4">
              {/* Current Role */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Current Role</p>
                <div className="flex items-center gap-2">
                  {getRoleBadge(currentRole)}
                  <span className="text-sm text-muted-foreground">
                    {USER_ROLES.find(r => r.value === currentRole)?.description}
                  </span>
                </div>
              </div>

              {/* Change Role */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Change Role</h4>
                <div className="space-y-2">
                  {USER_ROLES.map(role => (
                    <div
                      key={role.value}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRole === role.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedRole(role.value)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                        <div>
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                      {selectedRole === role.value && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleRoleChange} 
                  disabled={isLoading || selectedRole === currentRole}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Role
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6 mt-4">
              {/* Current Status */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <p className="font-medium capitalize">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Replies Used</p>
                  <p className="font-medium">{subscription.replies_used} / {subscription.replies_quota}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Topup Credits</p>
                  <p className="font-medium">{subscription.topup_credits_remaining}</p>
                </div>
              </div>

              {/* Change Plan */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Change Plan</h4>
                <div className="flex gap-2">
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_PLANS.map(plan => (
                        <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handlePlanChange} disabled={isLoading || selectedPlan === subscription.plan}>
                    Apply
                  </Button>
                </div>
              </div>

              {/* Add Credits */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Add Reply Credits</h4>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={addCredits}
                    onChange={(e) => setAddCredits(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddCredits} disabled={isLoading}>Add</Button>
                </div>
              </div>

              {/* Add Topup Credits */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Add Topup Credits</h4>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={addTopupCredits}
                    onChange={(e) => setAddTopupCredits(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddTopupCredits} disabled={isLoading}>Add</Button>
                </div>
              </div>

              {/* Reset Usage */}
              <div className="pt-2">
                <Button variant="outline" onClick={handleResetUsage} disabled={isLoading} className="w-full">
                  Reset Usage to 0
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Enable or disable sidebar menu items for this user.
              </p>
              <div className="space-y-3">
                {MENU_ITEMS.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b">
                    <Label htmlFor={item.id} className="text-sm">{item.label}</Label>
                    <Switch
                      id={item.id}
                      checked={sidebarSettings[item.id]}
                      onCheckedChange={() => handleToggleFeature(item.id)}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveFeatures} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Feature Access
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};