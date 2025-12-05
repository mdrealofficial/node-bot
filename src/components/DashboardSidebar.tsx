import { Facebook, Users, Send, MessagesSquare, BarChart3, CreditCard, Workflow, FileText, MessageCircle, Store, Bot, Instagram, Film, TestTube, PanelTop, Globe, ClipboardList, LifeBuoy } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NewFeatureBadge } from '@/components/user/NewFeatureBadge';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
const menuItems = [{
  title: "Overview",
  value: "overview",
  icon: BarChart3
}, {
  title: "Connect Account",
  value: "pages",
  icon: Facebook
}, {
  title: "FB Bot Flow",
  value: "flow",
  icon: Workflow
}, {
  title: "IG DM Flow",
  value: "instagram-dm-flow",
  icon: Instagram
}, {
  title: "WA Connect",
  value: "whatsapp-connect",
  icon: MessageCircle
}, {
  title: "WA Bot Flow",
  value: "whatsapp-flow",
  icon: Workflow
}, {
  title: "WA Live Chat",
  value: "whatsapp-chat",
  icon: MessagesSquare
}, {
  title: "WA Broadcast",
  value: "whatsapp-broadcast",
  icon: Send
}, {
  title: "WA Subscribers",
  value: "whatsapp-subscribers",
  icon: Users
}, {
  title: "Analysis",
  value: "analysis",
  icon: BarChart3
}, {
  title: "FB Subscribers",
  value: "fb-subscribers",
  icon: Users
}, {
  title: "IG Subscribers",
  value: "ig-subscribers",
  icon: Users
}, {
  title: "Live Chat",
  value: "chat",
  icon: MessagesSquare
}, {
  title: "Broadcast",
  value: "broadcast",
  icon: Send
}, {
  title: "Message Templates",
  value: "templates",
  icon: FileText
}, {
  title: "FB Comments",
  value: "comment-replies",
  icon: MessageCircle
}, {
  title: "IG Comments",
  value: "instagram-comments",
  icon: Instagram
}, {
  title: "IG Stories",
  value: "instagram-stories",
  icon: Film
}, {
  title: "IG Unsent Messages",
  value: "instagram-unsent",
  icon: Instagram
}, {
  title: "IG Tester",
  value: "instagram-tester",
  icon: TestTube
}, {
  title: "AI Assistant",
  value: "ai-assistant",
  icon: Bot
}, {
  title: "Store",
  value: "store",
  icon: Store
}, {
  title: "Page Builder",
  value: "page-builder",
  icon: PanelTop
}, {
  title: "Form Builder",
  value: "form-builder",
  icon: ClipboardList
}, {
  title: "Website Widget",
  value: "website-widget",
  icon: Globe
}];
interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  selectedPlatform: string;
  disableNavigation?: boolean;
}
export function DashboardSidebar({
  activeTab,
  onTabChange,
  selectedPlatform,
  disableNavigation = false
}: DashboardSidebarProps) {
  const {
    open
  } = useSidebar();
  const {
    user
  } = useAuth();
  const [visibleMenuItems, setVisibleMenuItems] = useState<typeof menuItems>([]);
  const [openTicketCount, setOpenTicketCount] = useState(0);

  // Load open ticket count
  useEffect(() => {
    const loadTicketCount = async () => {
      if (!user?.id) return;
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress', 'waiting_customer']);
      setOpenTicketCount(count || 0);
    };
    loadTicketCount();
  }, [user?.id]);

  useEffect(() => {
    const loadSidebarSettings = async () => {
      if (!user?.id) return;
      
      // Define platform-specific menu items
      const homeItems = ['overview', 'pages', 'broadcast', 'chat', 'store', 'page-builder', 'form-builder', 'website-widget', 'ai-assistant'];
      const facebookItems = ['flow', 'comment-replies', 'fb-subscribers', 'analysis'];
      const instagramItems = ['instagram-dm-flow', 'ig-subscribers', 'instagram-comments', 'instagram-stories', 'instagram-unsent', 'instagram-tester'];
      const whatsappItems = ['whatsapp-connect', 'whatsapp-flow', 'whatsapp-chat', 'whatsapp-broadcast', 'whatsapp-subscribers'];
      
      const {
        data
      } = await supabase.from('user_settings').select('sidebar_pages, sidebar_flow, sidebar_subscribers, sidebar_broadcast, sidebar_chat, sidebar_templates, sidebar_comment_replies, sidebar_store, sidebar_subscription, sidebar_analysis, sidebar_menu_order').eq('user_id', user.id).maybeSingle();

      // Filter based on visibility settings (default to true if no settings exist)
      let filtered = menuItems.filter(item => {
        if (!data) return true; // Show all items if no settings exist
        const settingKey = `sidebar_${item.value}` as keyof typeof data;
        return data[settingKey] ?? true;
      });

      // Filter based on selected platform
      if (selectedPlatform === 'home') {
        filtered = filtered.filter(item => homeItems.includes(item.value));
      } else if (selectedPlatform === 'facebook') {
        filtered = filtered.filter(item => facebookItems.includes(item.value));
      } else if (selectedPlatform === 'instagram') {
        filtered = filtered.filter(item => instagramItems.includes(item.value));
      } else if (selectedPlatform === 'whatsapp') {
        filtered = filtered.filter(item => whatsappItems.includes(item.value));
      }

      // Sort based on custom order if available
      if (data?.sidebar_menu_order && Array.isArray(data.sidebar_menu_order)) {
        filtered = filtered.sort((a, b) => {
          // Always keep Overview at the top
          if (a.value === 'overview') return -1;
          if (b.value === 'overview') return 1;
          const orderA = data.sidebar_menu_order.indexOf(a.value);
          const orderB = data.sidebar_menu_order.indexOf(b.value);

          // If not in order array, put at the end
          if (orderA === -1) return 1;
          if (orderB === -1) return -1;
          return orderA - orderB;
        });
      }
      setVisibleMenuItems(filtered);
    };
    loadSidebarSettings();
  }, [user?.id, selectedPlatform]);
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-primary flex-shrink-0" />
          {open && <h1 className="text-xl font-bold">SmartReply</h1>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {selectedPlatform === 'facebook' && 'Facebook Automations'}
            {selectedPlatform === 'instagram' && 'Instagram Automations'}
            {selectedPlatform === 'whatsapp' && 'WhatsApp Automations'}
            {selectedPlatform === 'home' && 'Dashboard'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map(item => <SidebarMenuItem key={item.value} className="relative">
                  <SidebarMenuButton 
                    onClick={() => {
                      if (disableNavigation && item.value !== 'subscription') return;
                      if (item.value === 'chat') {
                        // Open Live Chat in new tab
                        window.open('/live-chat', '_blank');
                      } else {
                        onTabChange(item.value);
                      }
                    }} 
                    isActive={activeTab === item.value} 
                    tooltip={item.title} 
                    className={`transition-all duration-200 hover:scale-105 hover:bg-accent/70 ${disableNavigation && item.value !== 'subscription' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={disableNavigation && item.value !== 'subscription'}
                  >
                    <item.icon />
                    <span className="flex items-center gap-1">
                      {item.title}
                      {open && <NewFeatureBadge featureName={item.title} variant="badge" />}
                    </span>
                  </SidebarMenuButton>
                  {!open && <NewFeatureBadge featureName={item.title} variant="dot" className="absolute top-2 right-2" />}
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    if (disableNavigation) return;
                    onTabChange('support');
                  }}
                  isActive={activeTab === 'support'}
                  tooltip="Support"
                  className={`transition-all duration-200 hover:scale-105 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 ${disableNavigation ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={disableNavigation}
                >
                  <LifeBuoy />
                  <span className="flex items-center gap-2">
                    Support
                    {openTicketCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-amber-500/20 text-amber-600">
                        {openTicketCount}
                      </Badge>
                    )}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onTabChange('subscription')}
                  isActive={activeTab === 'subscription'}
                  tooltip="Subscription"
                  className="transition-all duration-200 hover:scale-105 hover:bg-accent/70"
                >
                  <CreditCard />
                  <span>Subscription</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}