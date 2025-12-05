import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Facebook, Instagram, Plus, Trash2, Users, MessageSquare, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ConnectedWhatsApp from "./ConnectedWhatsApp";
import { useSearchParams } from "react-router-dom";

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  page_logo_url: string | null;
  followers_count: number | null;
  status: string;
  connected_at: string;
}

interface InstagramAccount {
  id: string;
  instagram_account_id: string;
  account_name: string;
  instagram_username: string;
  profile_picture_url: string | null;
  followers_count: number | null;
  status: string;
  connected_at: string;
}

interface Stats {
  facebookPages: number;
  instagramAccounts: number;
  totalMessages: number;
  planName: string;
  maxFacebookPages: number;
  maxInstagramAccounts: number;
}

interface ActiveUserInfo {
  name: string;
  email: string;
  phone: string;
}

export function ConnectedPages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTokens, setProcessingTokens] = useState(false);
  const [stats, setStats] = useState<Stats>({
    facebookPages: 0,
    instagramAccounts: 0,
    totalMessages: 0,
    planName: 'Free',
    maxFacebookPages: 1,
    maxInstagramAccounts: 1
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'facebook' | 'instagram';
    id: string;
  } | null>(null);
  const [mathQuestion, setMathQuestion] = useState({
    num1: 0,
    num2: 0,
    answer: ''
  });
  const [userAnswer, setUserAnswer] = useState('');
  
  // Active user dialog state
  const [activeUserDialogOpen, setActiveUserDialogOpen] = useState(false);
  const [activeUserInfo, setActiveUserInfo] = useState<ActiveUserInfo | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
      fetchPages();
      fetchInstagramAccounts();
      handleOAuthCallback();
    }
  }, [user]);

  // Handle OAuth callback from Facebook/Instagram
  const handleOAuthCallback = async () => {
    const code = searchParams.get('code');
    const platform = searchParams.get('platform');

    if (code && platform) {
      setProcessingTokens(true);
      try {
        if (platform === 'facebook') {
          const { data, error } = await supabase.functions.invoke('facebook-connect', {
            body: {
              action: 'callback',
              code,
              redirectUri: `${window.location.origin}/dashboard?tab=pages&platform=facebook`,
            }
          });

          if (error) throw error;

          toast({
            title: "Success!",
            description: `${data.imported || 0} page(s) imported successfully!`
          });
          fetchPages();
          loadStats();
        } else if (platform === 'instagram') {
          const { data, error } = await supabase.functions.invoke('instagram-connect', {
            body: {
              action: 'callback',
              code,
              redirectUri: `${window.location.origin}/dashboard?tab=pages&platform=instagram`,
            }
          });

          if (error) throw error;

          toast({
            title: "Success!",
            description: `${data.imported || 0} Instagram account(s) imported successfully!`
          });
          fetchInstagramAccounts();
          loadStats();
        }

        // Clean up URL params but keep tab
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('platform');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());
      } catch (error: any) {
        toast({
          title: "Connection Failed",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setProcessingTokens(false);
      }
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, replies_used')
      .eq('user_id', user.id)
      .single();

    const { data: limits } = await supabase.rpc('get_subscription_limits', {
      p_user_id: user.id
    });

    const { count: fbCount } = await supabase
      .from('facebook_pages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: igCount } = await supabase
      .from('instagram_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    setStats({
      facebookPages: fbCount || 0,
      instagramAccounts: igCount || 0,
      totalMessages: subscription?.replies_used || 0,
      planName: subscription?.plan || 'Free',
      maxFacebookPages: (limits as any)?.max_connected_pages || 1,
      maxInstagramAccounts: (limits as any)?.max_instagram_accounts || 1
    });
  };

  const fetchPages = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false });

    if (!error && data) setFacebookPages(data);
    setLoading(false);
  };

  const fetchInstagramAccounts = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false });

    if (!error && data) setInstagramAccounts(data);
  };

  const handleConnectFacebook = async () => {
    try {
      // Get Facebook app config
      const { data: configData } = await supabase
        .from('admin_config')
        .select('fb_app_id')
        .single();

      if (!configData?.fb_app_id) {
        throw new Error('Facebook App ID not configured');
      }

      const redirectUri = `${window.location.origin}/dashboard?tab=pages&platform=facebook`;
      const scope = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,business_management';
      
      // Build Facebook OAuth URL
      const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      authUrl.searchParams.set('client_id', configData.fb_app_id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'facebook_connect');

      // Redirect in same window
      window.location.href = authUrl.toString();
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConnectInstagram = async () => {
    try {
      // Get Facebook app config (Instagram uses Facebook OAuth)
      const { data: configData } = await supabase
        .from('admin_config')
        .select('fb_app_id')
        .single();

      if (!configData?.fb_app_id) {
        throw new Error('Facebook App ID not configured');
      }

      const redirectUri = `${window.location.origin}/dashboard?tab=pages&platform=instagram`;
      const scope = 'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,business_management';
      
      // Build Facebook OAuth URL (Instagram uses Facebook login)
      const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      authUrl.searchParams.set('client_id', configData.fb_app_id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'instagram_connect');

      // Redirect in same window
      window.location.href = authUrl.toString();
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (type: 'facebook' | 'instagram', id: string) => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setMathQuestion({
      num1,
      num2,
      answer: (num1 + num2).toString()
    });
    setUserAnswer('');
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userAnswer !== mathQuestion.answer) {
      toast({
        title: "Incorrect Answer",
        description: "Please solve the math problem correctly",
        variant: "destructive"
      });
      return;
    }

    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'facebook') {
        const { error } = await supabase
          .from('facebook_pages')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast({ title: "Success", description: "Facebook page disconnected" });
        fetchPages();
      } else if (deleteTarget.type === 'instagram') {
        const { error } = await supabase
          .from('instagram_accounts')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast({ title: "Success", description: "Instagram account disconnected" });
        fetchInstagramAccounts();
      }
      loadStats();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const togglePageStatus = async (pageId: string, platformPageId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // If trying to activate, check if it's active in another account
    if (newStatus === 'active') {
      try {
        const { data, error } = await supabase.functions.invoke('check-page-activation', {
          body: {
            platform: 'facebook',
            platformId: platformPageId,
            currentUserId: user?.id
          }
        });

        if (error) throw error;

        if (!data.canActivate) {
          setActiveUserInfo(data.activeUser);
          setActiveUserDialogOpen(true);
          return;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to check page status",
          variant: "destructive"
        });
        return;
      }
    }

    const { error } = await supabase
      .from('facebook_pages')
      .update({ status: newStatus })
      .eq('id', pageId);

    if (!error) {
      toast({
        title: "Success",
        description: `Page ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      });
      fetchPages();
    }
  };

  const toggleInstagramStatus = async (accountId: string, instagramAccountId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // If trying to activate, check if it's active in another account
    if (newStatus === 'active') {
      try {
        const { data, error } = await supabase.functions.invoke('check-page-activation', {
          body: {
            platform: 'instagram',
            platformId: instagramAccountId,
            currentUserId: user?.id
          }
        });

        if (error) throw error;

        if (!data.canActivate) {
          setActiveUserInfo(data.activeUser);
          setActiveUserDialogOpen(true);
          return;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to check account status",
          variant: "destructive"
        });
        return;
      }
    }

    const { error } = await supabase
      .from('instagram_accounts')
      .update({ status: newStatus })
      .eq('id', accountId);

    if (!error) {
      toast({
        title: "Success",
        description: `Account ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      });
      fetchInstagramAccounts();
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Animated motivational messages for loading state
  const [motivationalIndex, setMotivationalIndex] = useState(0);
  const motivationalMessages = [
    { emoji: "🚀", text: "Setting up your connection..." },
    { emoji: "🔐", text: "Securely generating access tokens..." },
    { emoji: "📱", text: "Importing your pages and accounts..." },
    { emoji: "⚡", text: "Configuring webhooks and permissions..." },
    { emoji: "✨", text: "Almost there! Finishing setup..." },
    { emoji: "🎉", text: "Your pages will appear shortly!" },
  ];

  useEffect(() => {
    if (processingTokens) {
      const interval = setInterval(() => {
        setMotivationalIndex((prev) => (prev + 1) % motivationalMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setMotivationalIndex(0);
    }
  }, [processingTokens]);

  return (
    <div className="space-y-6 p-6">
      {/* Token Processing Overlay with Animated Text */}
      {processingTokens && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-card p-10 rounded-2xl shadow-2xl text-center max-w-md border border-border">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto relative" />
            </div>
            <div className="min-h-[80px] flex flex-col items-center justify-center">
              <div 
                key={motivationalIndex} 
                className="animate-fade-in"
              >
                <span className="text-4xl mb-3 block">{motivationalMessages[motivationalIndex].emoji}</span>
                <h3 className="text-xl font-semibold text-foreground">
                  {motivationalMessages[motivationalIndex].text}
                </h3>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-1.5">
              {motivationalMessages.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    idx === motivationalIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-destructive font-medium mt-6 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Do not refresh or close this page
            </p>
          </div>
        </div>
      )}

      {/* Active User Dialog */}
      <AlertDialog open={activeUserDialogOpen} onOpenChange={setActiveUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Page Already Active</AlertDialogTitle>
            <AlertDialogDescription>
              This page is currently active in another account. Only one account can have this page active at a time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {activeUserInfo && (
            <div className="space-y-3 py-4 border-y">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{activeUserInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{activeUserInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{activeUserInfo.phone}</span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setActiveUserDialogOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-card/60 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-around gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-facebook/10">
                <Facebook className="h-5 w-5 text-facebook" />
              </div>
              <span className="text-2xl font-bold">{stats.facebookPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-instagram/10">
                <Instagram className="h-5 w-5 text-instagram" />
              </div>
              <span className="text-2xl font-bold">{stats.instagramAccounts}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">{stats.totalMessages}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <span className="text-2xl font-bold capitalize">{stats.planName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="facebook" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facebook" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Facebook Pages</h3>
              <p className="text-sm text-muted-foreground">Connect and manage your Facebook pages</p>
            </div>
            <Button onClick={handleConnectFacebook} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect Page
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : facebookPages.length === 0 ? (
            <Card className="bg-card/60 border-border/50">
              <CardContent className="py-12 text-center">
                <Facebook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Facebook Pages Connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your first Facebook page to start automating messages
                </p>
                <Button onClick={handleConnectFacebook} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect Page
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {facebookPages.map(page => (
                <Card key={page.id} className={cn("bg-card/60 border-border/50 transition-all", page.status === 'inactive' && "opacity-60")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {page.page_logo_url ? (
                          <img src={page.page_logo_url} alt={page.page_name} className="h-12 w-12 rounded-full object-cover border-2 border-facebook/20" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-facebook/10 flex items-center justify-center">
                            <Facebook className="h-6 w-6 text-facebook" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{page.page_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Users className="h-3 w-3" />
                            <span>{page.followers_count?.toLocaleString() || 0} followers</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={page.status === 'active' ? 'default' : 'secondary'}>
                          {page.status}
                        </Badge>
                        <Switch
                          checked={page.status === 'active'}
                          onCheckedChange={() => togglePageStatus(page.id, page.page_id, page.status)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick('facebook', page.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Connected {getTimeAgo(page.connected_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instagram" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Instagram Accounts</h3>
              <p className="text-sm text-muted-foreground">Connect and manage your Instagram business accounts</p>
            </div>
            <Button onClick={handleConnectInstagram} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect Account
            </Button>
          </div>

          {instagramAccounts.length === 0 ? (
            <Card className="bg-card/60 border-border/50">
              <CardContent className="py-12 text-center">
                <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Instagram Accounts Connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Instagram business account to start automating messages
                </p>
                <Button onClick={handleConnectInstagram} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {instagramAccounts.map(account => (
                <Card key={account.id} className={cn("bg-card/60 border-border/50 transition-all", account.status === 'inactive' && "opacity-60")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {account.profile_picture_url ? (
                          <img src={account.profile_picture_url} alt={account.account_name} className="h-12 w-12 rounded-full object-cover border-2 border-instagram/20" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-instagram/10 flex items-center justify-center">
                            <Instagram className="h-6 w-6 text-instagram" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{account.account_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>@{account.instagram_username}</span>
                            <span>•</span>
                            <Users className="h-3 w-3" />
                            <span>{account.followers_count?.toLocaleString() || 0} followers</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status}
                        </Badge>
                        <Switch
                          checked={account.status === 'active'}
                          onCheckedChange={() => toggleInstagramStatus(account.id, account.instagram_account_id, account.status)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick('instagram', account.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Connected {getTimeAgo(account.connected_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <ConnectedWhatsApp />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              To confirm disconnection, please solve this math problem:
              <br />
              <strong className="text-foreground">
                {mathQuestion.num1} + {mathQuestion.num2} = ?
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="math-answer">Your Answer</Label>
            <Input
              id="math-answer"
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Enter your answer"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
