import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Phone, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppQRConnection from "./WhatsAppQRConnection";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
interface WhatsAppAccount {
  id: string;
  phone_number: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  status: string;
  connected_at: string;
}
interface ActiveUserInfo {
  name: string;
  email: string;
  phone: string;
}
export default function ConnectedWhatsApp() {
  const {
    user
  } = useAuth();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTokens, setProcessingTokens] = useState(false);
  const [whatsappAppId, setWhatsappAppId] = useState<string>("");
  const [configId, setConfigId] = useState<string>("");

  // Active user dialog state
  const [activeUserDialogOpen, setActiveUserDialogOpen] = useState(false);
  const [activeUserInfo, setActiveUserInfo] = useState<ActiveUserInfo | null>(null);

  // Animated motivational messages for loading state - MUST be before any conditional returns
  const [motivationalIndex, setMotivationalIndex] = useState(0);
  const motivationalMessages = [{
    emoji: "🚀",
    text: "Setting up your WhatsApp connection..."
  }, {
    emoji: "🔐",
    text: "Securely generating access tokens..."
  }, {
    emoji: "📱",
    text: "Importing your WhatsApp accounts..."
  }, {
    emoji: "⚡",
    text: "Configuring webhooks and permissions..."
  }, {
    emoji: "✨",
    text: "Almost there! Finishing setup..."
  }, {
    emoji: "🎉",
    text: "Your accounts will appear shortly!"
  }];
  useEffect(() => {
    fetchAccounts();
    fetchWhatsAppConfig();
  }, []);
  useEffect(() => {
    if (processingTokens) {
      const interval = setInterval(() => {
        setMotivationalIndex(prev => (prev + 1) % motivationalMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setMotivationalIndex(0);
    }
  }, [processingTokens]);
  const fetchWhatsAppConfig = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('admin_config').select('whatsapp_app_id, whatsapp_config_id').single();
      if (error) throw error;
      if (data?.whatsapp_app_id) {
        setWhatsappAppId(data.whatsapp_app_id);
      }
      if (data?.whatsapp_config_id) {
        setConfigId(data.whatsapp_config_id);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error);
    }
  };
  const fetchAccounts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('whatsapp_accounts').select('*').order('connected_at', {
        ascending: false
      });
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching WhatsApp accounts:', error);
      toast.error('Failed to load WhatsApp accounts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const code = params.get('code');
    const phoneNumberId = params.get('phone_number_id');
    const businessAccountId = params.get('business_account_id');
    if (state === 'whatsapp_signup' && code) {
      setProcessingTokens(true);
      (async () => {
        try {
          const {
            data: {
              session
            }
          } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');
          if (!phoneNumberId) {
            throw new Error('Missing phone number information from WhatsApp. Please try connecting again.');
          }
          const {
            data,
            error
          } = await supabase.functions.invoke('whatsapp-connect', {
            body: {
              action: 'connect',
              code,
              phoneNumberId,
              businessAccountId
            }
          });
          if (error) throw error;
          toast.success('WhatsApp account connected successfully');
          fetchAccounts();
        } catch (error: any) {
          console.error('Error completing WhatsApp connection:', error);
          toast.error(error.message || 'Failed to complete WhatsApp connection');
        } finally {
          setProcessingTokens(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          url.searchParams.delete('phone_number_id');
          url.searchParams.delete('business_account_id');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, []);
  const handleConnect = () => {
    if (!whatsappAppId) {
      toast.error('WhatsApp App ID not configured. Please ask admin to configure it in Settings.');
      return;
    }
    const redirectUri = `${window.location.origin}/dashboard?tab=pages&platform=whatsapp`;

    // Use embedded signup with config_id if available (allows creating NEW accounts)
    // Otherwise fall back to OAuth flow (existing accounts only)
    let url: string;
    if (configId) {
      // Embedded signup flow - supports creating new WhatsApp Business accounts
      url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${whatsappAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&config_id=${configId}&state=whatsapp_signup`;
    } else {
      // Standard OAuth flow - only for existing accounts
      url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${whatsappAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=whatsapp_business_messaging,whatsapp_business_management&state=whatsapp_signup`;
      toast.info('Config ID not set. You can only connect existing WhatsApp accounts. Ask admin to configure Embedded Signup Config ID for new account creation.');
    }

    // Redirect in same window
    window.location.href = url;
  };
  const handleDisconnect = async (phoneNumberId: string, displayPhone: string) => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await supabase.functions.invoke('whatsapp-connect', {
        body: {
          action: 'disconnect',
          phoneNumberId: phoneNumberId
        }
      });
      if (response.error) throw response.error;
      toast.success(`Disconnected ${displayPhone}`);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error(error.message || 'Failed to disconnect WhatsApp account');
    }
  };
  const toggleWhatsAppStatus = async (accountId: string, phoneNumberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    // If trying to activate, check if it's active in another account
    if (newStatus === 'active') {
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('check-page-activation', {
          body: {
            platform: 'whatsapp',
            platformId: phoneNumberId,
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
        toast.error('Failed to check account status');
        return;
      }
    }
    const {
      error
    } = await supabase.from('whatsapp_accounts').update({
      status: newStatus
    }).eq('id', accountId);
    if (!error) {
      toast.success(`Account ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchAccounts();
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Token Processing Overlay with Animated Text */}
      {processingTokens && <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-card p-10 rounded-2xl shadow-2xl text-center max-w-md border border-border">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto relative" />
            </div>
            <div className="min-h-[80px] flex flex-col items-center justify-center">
              <div key={motivationalIndex} className="animate-fade-in">
                <span className="text-4xl mb-3 block">{motivationalMessages[motivationalIndex].emoji}</span>
                <h3 className="text-xl font-semibold text-foreground">
                  {motivationalMessages[motivationalIndex].text}
                </h3>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-1.5">
              {motivationalMessages.map((_, idx) => <div key={idx} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${idx === motivationalIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30'}`} />)}
            </div>
            <p className="text-sm text-destructive font-medium mt-6 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Do not refresh or close this page
            </p>
          </div>
        </div>}

      {/* Active User Dialog */}
      <AlertDialog open={activeUserDialogOpen} onOpenChange={setActiveUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Already Active</AlertDialogTitle>
            <AlertDialogDescription>
              This WhatsApp account is currently active in another user's account. Only one user can have this account active at a time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {activeUserInfo && <div className="space-y-3 py-4 border-y">
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
            </div>}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setActiveUserDialogOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h2 className="text-2xl font-bold">WhatsApp Business Accounts</h2>
        <p className="text-muted-foreground">
          Connect and manage your WhatsApp Business accounts
        </p>
      </div>

      <Tabs defaultValue="signup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signup">WhatsApp Business API Signup</TabsTrigger>
          <TabsTrigger value="existing">Connect Existing API</TabsTrigger>
          <TabsTrigger value="qr">QR Based Login</TabsTrigger>
        </TabsList>

        <TabsContent value="signup" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business API Signup</CardTitle>
              <CardDescription>
                Sign up for a new WhatsApp Business API account through Facebook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnect}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Start WhatsApp Business API Signup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect Existing WhatsApp Business API</CardTitle>
              <CardDescription>
                Connect your already configured WhatsApp Business Cloud API account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This feature allows you to connect an existing WhatsApp Business Cloud API that you've already set up.
              </p>
              <Button variant="outline" onClick={() => toast.info('Coming soon - Connect your existing WhatsApp Business API')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Connect Existing API
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4 mt-6">
          <WhatsAppQRConnection />
        </TabsContent>
      </Tabs>

      {accounts.length === 0 ? <Card>
          
        </Card> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.verified_name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {account.display_phone_number}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                      {account.status === 'active' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {account.status !== 'active' && <AlertCircle className="mr-1 h-3 w-3" />}
                      {account.status}
                    </Badge>
                    <Switch checked={account.status === 'active'} onCheckedChange={() => toggleWhatsAppStatus(account.id, account.phone_number_id, account.status)} />
                  </div>
                </div>

                {account.quality_rating && <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality Rating</span>
                    <Badge variant="outline">{account.quality_rating}</Badge>
                  </div>}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Connected</span>
                  <span>{new Date(account.connected_at).toLocaleDateString()}</span>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect WhatsApp Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to disconnect {account.display_phone_number}? 
                        This will stop all automation and you won't receive messages anymore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDisconnect(account.phone_number, account.display_phone_number)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>)}
        </div>}
    </div>;
}