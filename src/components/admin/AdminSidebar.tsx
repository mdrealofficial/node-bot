import { useState } from 'react';
import { 
  Settings, Users, Database, ArrowLeftRight, CreditCard, Package, 
  Layers, Bell, Palette, MessageCircle, Zap, MessageSquare, Mail, 
  FileText, LayoutDashboard, ChevronDown, ChevronRight, Globe,
  Shield, Server, Activity, Ticket, Tag
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  value: string;
  icon: React.ElementType;
}

interface MenuGroup {
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
}

// Top-level items (no parent group)
const topLevelItems: MenuItem[] = [
  { title: "Dashboard", value: "dashboard", icon: LayoutDashboard },
];

const menuGroups: MenuGroup[] = [
  {
    title: "Support",
    icon: Ticket,
    items: [
      { title: "Tickets", value: "tickets", icon: Ticket },
    ]
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "Configuration", value: "config", icon: Settings },
      { title: "Branding", value: "branding", icon: Palette },
      { title: "Map Settings", value: "map-settings", icon: Globe },
    ]
  },
  {
    title: "Communication",
    icon: MessageCircle,
    items: [
      { title: "WAHA Settings", value: "waha", icon: MessageCircle },
      { title: "System SMS", value: "system-sms", icon: MessageSquare },
      { title: "System SMTP", value: "system-smtp", icon: Mail },
      { title: "Email Templates", value: "email-templates", icon: Mail },
      { title: "SMS Templates", value: "sms-templates", icon: FileText },
    ]
  },
  {
    title: "User Management",
    icon: Users,
    items: [
      { title: "Users", value: "users", icon: Users },
      { title: "Subscriptions", value: "subscriptions", icon: CreditCard },
    ]
  },
  {
    title: "Billing",
    icon: CreditCard,
    items: [
      { title: "Plans", value: "plans", icon: Package },
      { title: "Top-up Packages", value: "topup-packages", icon: Zap },
      { title: "Coupons", value: "coupons", icon: Tag },
      { title: "Payment Method", value: "payment", icon: CreditCard },
    ]
  },
  {
    title: "Features",
    icon: Layers,
    items: [
      { title: "Features", value: "features", icon: Layers },
      { title: "Announcements", value: "announcements", icon: Bell },
    ]
  },
  {
    title: "System",
    icon: Server,
    items: [
      { title: "System Health", value: "system-health", icon: Activity },
      { title: "Backup", value: "backup", icon: Database },
      { title: "Data Deletion", value: "data-deletion", icon: Shield },
      { title: "Migration", value: "migration", icon: ArrowLeftRight },
    ]
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (value: string) => void;
}

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  // Find which group contains the active section
  const getActiveGroup = () => {
    for (const group of menuGroups) {
      if (group.items.some(item => item.value === activeSection)) {
        return group.title;
      }
    }
    return '';
  };

  const [openGroups, setOpenGroups] = useState<string[]>([getActiveGroup()]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {/* Top-level items (Dashboard) */}
              <SidebarMenu>
                {topLevelItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(item.value)}
                      isActive={activeSection === item.value}
                      tooltip={item.title}
                      className="transition-all duration-200 hover:scale-105 hover:bg-accent/70"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              {/* Collapsible groups */}
              {menuGroups.map((group) => {
                const isGroupOpen = openGroups.includes(group.title);
                const hasActiveItem = group.items.some(item => item.value === activeSection);
                
                return (
                  <Collapsible 
                    key={group.title} 
                    open={isGroupOpen} 
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          hasActiveItem && "bg-accent/50 text-accent-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <group.icon className="h-4 w-4" />
                          <span>{group.title}</span>
                        </div>
                        {isGroupOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1">
                      <SidebarMenu className="ml-4 border-l border-border/50 pl-2">
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.value}>
                            <SidebarMenuButton
                              onClick={() => onSectionChange(item.value)}
                              isActive={activeSection === item.value}
                              tooltip={item.title}
                              className="transition-all duration-200 hover:scale-105 hover:bg-accent/70"
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}