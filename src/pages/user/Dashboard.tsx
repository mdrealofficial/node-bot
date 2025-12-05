import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, MessageSquare, User, KeyRound, ChevronDown, Settings, ArrowLeft, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Instagram, MessageCircle, Music } from 'lucide-react';
import { InstagramChatbotFlow } from '@/components/user/InstagramChatbotFlow';
import { ConnectedPages } from '@/components/user/ConnectedPages';
import Subscription from '@/components/user/Subscription';
import Subscribers from '@/components/user/Subscribers';
import Broadcast from '@/components/user/Broadcast';
import LiveChat from '@/components/user/LiveChat';
import { ChatbotFlow } from '@/components/user/ChatbotFlow';
import { FlowAnalytics } from '@/components/user/FlowAnalytics';
import { MessageTemplates } from '@/components/user/MessageTemplates';
import { CommentReplies } from '@/components/user/CommentReplies';
import { StoreManager } from '@/components/user/StoreManager';
import { PhoneVerificationDialog } from '@/components/user/PhoneVerificationDialog';
import { AIAssistant } from '@/components/user/AIAssistant';
import { DashboardOverview } from '@/components/user/DashboardOverview';
import { InstagramCommentAutomation } from '@/components/user/InstagramCommentAutomation';
import { InstagramStoryAutomation } from '@/components/user/InstagramStoryAutomation';
import { InstagramAutomationTester } from '@/components/user/InstagramAutomationTester';
import { InstagramUnsentMessages } from '@/components/user/InstagramUnsentMessages';
import { FacebookAnalytics } from '@/components/user/FacebookAnalytics';
import { QuotaWarningBanner } from '@/components/user/QuotaWarningBanner';
import { FeatureAnnouncements } from '@/components/user/FeatureAnnouncements';
import ConnectedWhatsApp from '@/components/user/ConnectedWhatsApp';
import { WhatsAppChatbotFlow } from '@/components/user/WhatsAppChatbotFlow';
import { WhatsAppLiveChat } from '@/components/user/WhatsAppLiveChat';
import { WhatsAppBroadcast } from '@/components/user/WhatsAppBroadcast';
import WebsiteChatWidget from '@/components/user/WebsiteChatWidget';
import { LandingPageList } from '@/components/user/landing-page/LandingPageList';
import { FormList } from '@/components/user/form-builder/FormList';
import { SupportTickets } from '@/components/user/SupportTickets';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Get initial tab from URL, default to 'overview' if not present
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    // Check URL param first for OAuth callback, then localStorage
    const platformFromUrl = searchParams.get('platform');
    if (platformFromUrl && ['facebook', 'instagram', 'whatsapp'].includes(platformFromUrl)) {
      return platformFromUrl;
    }
    return localStorage.getItem('selectedPlatform') || 'home';
  });
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [showPlanSelectionPopup, setShowPlanSelectionPopup] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [needsPlanSelection, setNeedsPlanSelection] = useState(false);

  // Persist selected platform to localStorage
  useEffect(() => {
    localStorage.setItem('selectedPlatform', selectedPlatform);
  }, [selectedPlatform]);

  // Check if admin is impersonating this user
  useEffect(() => {
    const checkImpersonation = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('admin_impersonations')
        .select('*')
        .eq('impersonated_user_id', user.id)
        .is('ended_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      setIsImpersonating(!!data && !error);
    };

    checkImpersonation();
  }, [user?.id]);

  // Update URL when tab changes - block navigation if plan selection is required
  const handleTabChange = (newTab: string) => {
    if (needsPlanSelection && newTab !== 'subscription') {
      toast({
        title: 'Please Select a Plan',
        description: 'You need to choose a subscription plan before accessing other features.',
        variant: 'destructive',
        duration: 3000,
      });
      return; // Block navigation
    }
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Check phone verification first, then subscription
  useEffect(() => {
    const checkPhoneAndSubscription = async () => {
      if (!user?.id) return;

      // First check phone verification
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      if (!profile?.phone_verified) {
        setShowVerificationDialog(true);
        setPhoneVerified(false);
        return; // Wait for phone verification before checking subscription
      }

      setPhoneVerified(true);
      
      // Phone is verified, now check subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!subscription && !error) {
        // No subscription found - force plan selection
        setNeedsPlanSelection(true);
        setShowPlanSelectionPopup(true);
        setActiveTab('subscription');
        setSearchParams({ tab: 'subscription' });
      }
    };

    checkPhoneAndSubscription();
  }, [user?.id]);

  // Handle phone verification completion - then check subscription
  const handlePhoneVerified = async () => {
    setShowVerificationDialog(false);
    setPhoneVerified(true);

    // Now check subscription after phone verification
    if (!user?.id) return;
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription && !error) {
      // Force user to subscription tab and block navigation
      setNeedsPlanSelection(true);
      setShowPlanSelectionPopup(true);
      setActiveTab('subscription');
      setSearchParams({ tab: 'subscription' });
    }
  };

  // Handle plan selection completion
  const handlePlanSelected = () => {
    setShowPlanSelectionPopup(false);
    setNeedsPlanSelection(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitImpersonation = async () => {
    if (!user?.id) return;
    
    // End the impersonation session
    const { error } = await supabase
      .from('admin_impersonations')
      .update({ ended_at: new Date().toISOString() })
      .eq('impersonated_user_id', user.id)
      .is('ended_at', null);

    if (error) {
      console.error('Failed to end impersonation:', error);
      return;
    }

    // Logout and redirect to login so admin can log back in
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    // Social media specific tabs (overview is platform-agnostic)
    const socialMediaTabs = ['pages', 'flow', 'flow-analytics', 'subscribers', 'broadcast', 'templates', 'comment-replies', 'analysis'];
    
    // If on a social media tab and platform is tiktok, show coming soon message
    if (socialMediaTabs.includes(activeTab) && selectedPlatform === 'tiktok') {
      return (
        <div className="animate-fade-in">
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground text-center">
                TikTok integration is coming soon. Stay tuned!
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const content = (() => {
      switch (activeTab) {
        case 'overview':
          return <DashboardOverview />;
        case 'pages':
          return <ConnectedPages />;
        case 'flow':
          return <ChatbotFlow />;
        case 'flow-analytics':
          return <FlowAnalytics />;
        case 'analysis':
          return <FacebookAnalytics />;
        case 'subscribers':
          return <Subscribers />;
        case 'fb-subscribers':
          return <Subscribers initialPlatform="facebook" />;
        case 'ig-subscribers':
          return <Subscribers initialPlatform="instagram" />;
        case 'broadcast':
          return <Broadcast />;
        case 'chat':
          return <LiveChat />;
        case 'templates':
          return <MessageTemplates />;
        case 'comment-replies':
          return <CommentReplies />;
        case 'instagram-comments':
          return <InstagramCommentAutomation />;
        case 'instagram-stories':
          return <InstagramStoryAutomation />;
        case 'instagram-unsent':
          return <InstagramUnsentMessages />;
        case 'instagram-tester':
          return <InstagramAutomationTester />;
        case 'instagram-dm-flow':
          return <InstagramChatbotFlow />;
        case 'whatsapp-connect':
          return <ConnectedWhatsApp />;
        case 'whatsapp-flow':
          return <WhatsAppChatbotFlow />;
        case 'whatsapp-chat':
          return <WhatsAppLiveChat />;
        case 'whatsapp-broadcast':
          return <WhatsAppBroadcast />;
        case 'whatsapp-subscribers':
          return <Card className="mt-8">
            <CardHeader>
              <CardTitle>WhatsApp Subscribers</CardTitle>
              <CardDescription>View and manage your WhatsApp subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">WhatsApp subscribers management coming soon. Connect your WhatsApp account first.</p>
            </CardContent>
          </Card>;
        case 'store':
          return <StoreManager />;
        case 'page-builder':
          return <LandingPageList
            onEdit={(pageId) => navigate(`/page-builder?mode=edit&pageId=${pageId}`)}
            onCreate={() => navigate('/page-builder?mode=create')}
          />;
        case 'form-builder':
          return <FormList
            onEdit={(formId) => navigate(`/form-builder?mode=edit&formId=${formId}`)}
            onCreate={() => navigate('/form-builder?mode=create')}
            onViewSubmissions={(formId) => navigate(`/form-builder?submissionsId=${formId}`)}
          />;
        case 'website-widget':
          return <WebsiteChatWidget />;
        case 'ai-assistant':
          return <AIAssistant />;
        case 'support':
          return <SupportTickets />;
        case 'subscription':
          return <Subscription 
            showPlanSelectionPopup={showPlanSelectionPopup} 
            onPlanSelected={handlePlanSelected}
            forceSelection={needsPlanSelection}
          />;
        default:
          return <DashboardOverview />;
      }
    })();

    return <div key={activeTab} className="animate-fade-in">{content}</div>;
  };

  return (
    <SidebarProvider>
      <PhoneVerificationDialog 
        open={showVerificationDialog} 
        onVerified={handlePhoneVerified} 
      />
      <div className="min-h-screen w-full flex bg-muted/30">
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} selectedPlatform={selectedPlatform} disableNavigation={needsPlanSelection} />
        
        <SidebarInset className="flex-1">
          {isImpersonating && (
            <div className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between sticky top-0 z-20 shadow-md">
              <span className="text-sm font-medium">
                You are impersonating this user
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExitImpersonation}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Button>
            </div>
          )}
          <header className="border-b bg-card sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <SidebarTrigger />

              {/* Social Media Platform Tabs - Hide on Subscription, Store, Page Builder, Form Builder, Website Widget, and Live Chat */}
              {!['subscription', 'store', 'chat', 'page-builder', 'form-builder', 'website-widget'].includes(activeTab) && (
                <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform} className="flex-1 max-w-xl mx-4">
                  <TabsList className="grid grid-cols-5 h-9 p-0.5">
                    <TabsTrigger value="home" className="gap-1 px-2 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <BarChart3 className="h-3 w-3" />
                      <span className="hidden md:inline">Home</span>
                    </TabsTrigger>
                    <TabsTrigger value="facebook" className="gap-1 px-2 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Facebook className="h-3 w-3" />
                      <span className="hidden md:inline">Facebook</span>
                    </TabsTrigger>
                    <TabsTrigger value="instagram" className="gap-1 px-2 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Instagram className="h-3 w-3" />
                      <span className="hidden md:inline">Instagram</span>
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="gap-1 px-2 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <MessageCircle className="h-3 w-3" />
                      <span className="hidden md:inline">WhatsApp</span>
                    </TabsTrigger>
                    <TabsTrigger value="tiktok" disabled className="gap-1 px-2 py-1 text-xs relative opacity-50">
                      <Music className="h-3 w-3" />
                      <span className="hidden md:inline">TikTok</span>
                      <Badge variant="secondary" className="hidden lg:inline-flex ml-1 text-[8px] px-1 py-0 h-3">Soon</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              
              <div className="flex items-center gap-2">
                <FeatureAnnouncements />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 hover:bg-accent/50">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">{user?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/reset-password')} className="cursor-pointer">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="space-y-4">
                {renderContent()}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
