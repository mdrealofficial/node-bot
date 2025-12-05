import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Cake, 
  User, 
  Bot,
  RotateCcw,
  Link as LinkIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Template {
  id: string;
  name: string;
  icon: any;
  description?: string;
  is_system?: boolean;
}

interface ActionButtonSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string, templateName: string) => void;
}

const SYSTEM_TEMPLATES: Template[] = [
  {
    id: "get-started",
    name: "Get-started Template",
    icon: CheckCircle,
    is_system: true
  },
  {
    id: "no-match",
    name: "No Match Template",
    icon: XCircle,
    is_system: true
  },
  {
    id: "unsubscribe",
    name: "Un-subscribe Template",
    icon: XCircle,
    is_system: true
  },
  {
    id: "resubscribe",
    name: "Re-subscribe Template",
    icon: CheckCircle,
    is_system: true
  },
  {
    id: "email-quick-reply",
    name: "Email Quick Reply Template",
    icon: Mail,
    is_system: true
  },
  {
    id: "phone-quick-reply",
    name: "Phone Quick Reply Template",
    icon: Phone,
    is_system: true
  },
  {
    id: "location-quick-reply",
    name: "Location Quick Reply Template",
    icon: MapPin,
    is_system: true
  },
  {
    id: "birthday-quick-reply",
    name: "Birthday Quick Reply Template",
    icon: Cake,
    is_system: true
  },
  {
    id: "chat-human",
    name: "Chat with Human Template",
    icon: User,
    is_system: true
  },
  {
    id: "chat-robot",
    name: "Chat with Robot Template",
    icon: Bot,
    is_system: true
  }
];

export const ActionButtonSettings = ({ 
  open, 
  onOpenChange,
  onSelectTemplate 
}: ActionButtonSettingsProps) => {
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadUserTemplates();
    }
  }, [open]);

  const loadUserTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("id, name, description")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const templates: Template[] = (data || []).map(flow => ({
        id: flow.id,
        name: flow.name,
        icon: Bot,
        description: flow.description || undefined,
        is_system: false
      }));

      setUserTemplates(templates);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template.id);
    if (onSelectTemplate) {
      onSelectTemplate(template.id, template.name);
    }
    toast.success(`Selected: ${template.name}`);
  };

  const handleReset = () => {
    setSelectedTemplate("");
    toast.success("Action button settings reset to default");
  };

  const renderTemplateCard = (template: Template) => {
    const Icon = template.icon;
    const isSelected = selectedTemplate === template.id;

    return (
      <Card
        key={template.id}
        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
          isSelected ? "border-primary bg-primary/5" : "border-border"
        }`}
        onClick={() => handleSelectTemplate(template)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              isSelected ? "text-primary" : "text-muted-foreground"
            }`} />
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm ${
                isSelected ? "text-primary" : "text-foreground"
              }`}>
                {template.name}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <LinkIcon className="h-5 w-5" />
              Action button settings
            </DialogTitle>
            <Button variant="outline" size="sm">
              Variables
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="your" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="your">Your Templates</TabsTrigger>
              <TabsTrigger value="system">System Action Template</TabsTrigger>
            </TabsList>

            <TabsContent value="your" className="flex-1 overflow-auto mt-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  Loading templates...
                </div>
              ) : userTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-base mb-2">No templates found</p>
                  <p className="text-sm">Create flows to use them as action templates</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 pb-4">
                  {userTemplates.map(renderTemplateCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-auto mt-0">
              <div className="grid grid-cols-2 gap-4 pb-4">
                {SYSTEM_TEMPLATES.map(renderTemplateCard)}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t pt-4 mt-4">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset all action button settings to default.
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
