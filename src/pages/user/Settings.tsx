import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bell, Shield, Palette, Mail, Loader2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { AIConfiguration } from '@/components/user/AIConfiguration';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [flowExecutionAlerts, setFlowExecutionAlerts] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [newSubscriberAlerts, setNewSubscriberAlerts] = useState(false);

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

  // Appearance settings
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // Sidebar menu visibility settings
  const [sidebarPages, setSidebarPages] = useState(true);
  const [sidebarFlow, setSidebarFlow] = useState(true);
  const [sidebarSubscribers, setSidebarSubscribers] = useState(true);
  const [sidebarBroadcast, setSidebarBroadcast] = useState(true);
  const [sidebarChat, setSidebarChat] = useState(true);
  const [sidebarTemplates, setSidebarTemplates] = useState(true);
  const [sidebarCommentReplies, setSidebarCommentReplies] = useState(true);
  const [sidebarStore, setSidebarStore] = useState(true);
  const [sidebarSubscription, setSidebarSubscription] = useState(true);

  const sidebarMenuItems = [
    { id: 'pages', label: 'Pages', description: 'Show Pages menu item', state: sidebarPages, setState: setSidebarPages },
    { id: 'flow', label: 'Chatbot Flow', description: 'Show Chatbot Flow menu item', state: sidebarFlow, setState: setSidebarFlow },
    { id: 'subscribers', label: 'Subscribers', description: 'Show Subscribers menu item', state: sidebarSubscribers, setState: setSidebarSubscribers },
    { id: 'broadcast', label: 'Broadcast', description: 'Show Broadcast menu item', state: sidebarBroadcast, setState: setSidebarBroadcast },
    { id: 'chat', label: 'Live Chat', description: 'Show Live Chat menu item', state: sidebarChat, setState: setSidebarChat },
    { id: 'templates', label: 'Message Templates', description: 'Show Message Templates menu item', state: sidebarTemplates, setState: setSidebarTemplates },
    { id: 'comment_replies', label: 'Comment Replies', description: 'Show Comment Replies menu item', state: sidebarCommentReplies, setState: setSidebarCommentReplies },
    { id: 'store', label: 'Store', description: 'Show Store menu item', state: sidebarStore, setState: setSidebarStore },
    { id: 'subscription', label: 'Subscription', description: 'Show Subscription menu item', state: sidebarSubscription, setState: setSidebarSubscription },
  ];

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setEmailNotifications(data.email_notifications);
          setPushNotifications(data.push_notifications);
          setFlowExecutionAlerts(data.flow_execution_alerts);
          setOrderNotifications(data.order_notifications);
          setNewSubscriberAlerts(data.new_subscriber_alerts);
          setProfileVisibility(data.profile_visibility);
          setDataSharing(data.data_sharing);
          setDarkMode(data.dark_mode);
          setCompactMode(data.compact_mode);
          setSidebarPages(data.sidebar_pages ?? true);
          setSidebarFlow(data.sidebar_flow ?? true);
          setSidebarSubscribers(data.sidebar_subscribers ?? true);
          setSidebarBroadcast(data.sidebar_broadcast ?? true);
          setSidebarChat(data.sidebar_chat ?? true);
          setSidebarTemplates(data.sidebar_templates ?? true);
          setSidebarCommentReplies(data.sidebar_comment_replies ?? true);
          setSidebarStore(data.sidebar_store ?? true);
          setSidebarSubscription(data.sidebar_subscription ?? true);
        }
      } catch (error: any) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const handleSaveSettings = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const settingsData = {
        user_id: user.id,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        flow_execution_alerts: flowExecutionAlerts,
        order_notifications: orderNotifications,
        new_subscriber_alerts: newSubscriberAlerts,
        profile_visibility: profileVisibility,
        data_sharing: dataSharing,
        dark_mode: darkMode,
        compact_mode: compactMode,
        sidebar_pages: sidebarPages,
        sidebar_flow: sidebarFlow,
        sidebar_subscribers: sidebarSubscribers,
        sidebar_broadcast: sidebarBroadcast,
        sidebar_chat: sidebarChat,
        sidebar_templates: sidebarTemplates,
        sidebar_comment_replies: sidebarCommentReplies,
        sidebar_store: sidebarStore,
        sidebar_subscription: sidebarSubscription,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="sidebar" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Sidebar
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="flow-alerts">Flow Execution Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when flows are executed
                      </p>
                    </div>
                    <Switch
                      id="flow-alerts"
                      checked={flowExecutionAlerts}
                      onCheckedChange={setFlowExecutionAlerts}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="order-notifications">Order Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts for new orders
                      </p>
                    </div>
                    <Switch
                      id="order-notifications"
                      checked={orderNotifications}
                      onCheckedChange={setOrderNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="subscriber-alerts">New Subscriber Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you have new subscribers
                      </p>
                    </div>
                    <Switch
                      id="subscriber-alerts"
                      checked={newSubscriberAlerts}
                      onCheckedChange={setNewSubscriberAlerts}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Manage browser push notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable browser push notifications
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="profile-visibility">Public Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        Make your profile visible to other users
                      </p>
                    </div>
                    <Switch
                      id="profile-visibility"
                      checked={profileVisibility}
                      onCheckedChange={setProfileVisibility}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="data-sharing">Analytics & Data Sharing</Label>
                      <p className="text-sm text-muted-foreground">
                        Share anonymous usage data to help improve the platform
                      </p>
                    </div>
                    <Switch
                      id="data-sharing"
                      checked={dataSharing}
                      onCheckedChange={setDataSharing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                    Export or delete your account data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full">
                    Export My Data
                  </Button>
                  <Button variant="destructive" className="w-full">
                    Delete My Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how the application looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Switch to dark theme
                      </p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compact-mode">Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Reduce spacing for a more compact interface
                      </p>
                    </div>
                    <Switch
                      id="compact-mode"
                      checked={compactMode}
                      onCheckedChange={setCompactMode}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sidebar" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sidebar Menu Items</CardTitle>
                  <CardDescription>
                    Toggle visibility of sidebar menu items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sidebarMenuItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="space-y-0.5">
                          <Label htmlFor={`sidebar-${item.id}`}>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          id={`sidebar-${item.id}`}
                          checked={item.state}
                          onCheckedChange={item.setState}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <AIConfiguration />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} size="lg" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;