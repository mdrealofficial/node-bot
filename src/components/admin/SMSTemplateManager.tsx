import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, Edit, Search, Loader2, Send, 
  Variable, RefreshCw, Copy, AlertCircle
} from 'lucide-react';

interface SMSTemplate {
  id: string;
  template_key: string;
  category: string;
  name: string;
  description: string | null;
  content: string;
  variables: { name: string; description: string }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  { id: 'all', label: 'All Templates' },
  { id: 'auth', label: 'Authentication' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'notification', label: 'Notification' },
  { id: 'payment', label: 'Payment' },
  { id: 'subscription', label: 'Subscription' },
];

const SMS_SEGMENT_LENGTH = 160;
const UNICODE_SEGMENT_LENGTH = 70;

export default function SMSTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [appName, setAppName] = useState('FB SmartReply');

  useEffect(() => {
    loadTemplates();
    loadAppName();
  }, []);

  const loadAppName = async () => {
    try {
      const { data } = await supabase
        .from('admin_config')
        .select('app_name')
        .single();
      if (data?.app_name) {
        setAppName(data.app_name);
      }
    } catch (error) {
      console.error('Failed to load app name:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_sms_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      const parsedTemplates = (data || []).map(t => ({
        ...t,
        variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : (t.variables || [])
      }));
      
      setTemplates(parsedTemplates);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load SMS templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (template: SMSTemplate) => {
    try {
      const { error } = await supabase
        .from('system_sms_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));

      toast({
        title: 'Success',
        description: `Template ${!template.is_active ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update template status',
        variant: 'destructive',
      });
    }
  };

  const openEditor = (template: SMSTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
    setIsEditorOpen(true);
  };

  const getCharacterInfo = (text: string) => {
    const hasUnicode = /[^\x00-\x7F]/.test(text);
    const segmentLength = hasUnicode ? UNICODE_SEGMENT_LENGTH : SMS_SEGMENT_LENGTH;
    const charCount = text.length;
    const segments = Math.ceil(charCount / segmentLength) || 1;

    return {
      charCount,
      segments,
      segmentLength,
      hasUnicode,
      remaining: segmentLength - (charCount % segmentLength || segmentLength),
    };
  };

  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`;
    setEditedContent(prev => prev + variable);
  };

  const generatePreview = (content: string) => {
    const sampleData: Record<string, string> = {
      app_name: appName,
      otp_code: '123456',
      expiry_minutes: '5',
      code: '847291',
      reset_code: 'ABC123',
      usage_percent: '85',
      replies_remaining: '150',
      upgrade_url: 'bit.ly/upgrade',
      amount: '৳999',
      transaction_id: 'TXN123',
      update_url: 'bit.ly/update',
      plan_name: 'Pro',
      days_remaining: '7',
      renew_url: 'bit.ly/renew',
      user_name: 'John',
      dashboard_url: 'bit.ly/dash',
    };

    let preview = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return preview;
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_sms_templates')
        .update({ content: editedContent })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t =>
        t.id === selectedTemplate.id ? { ...t, content: editedContent } : t
      ));

      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });

      setIsEditorOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !selectedTemplate) return;

    try {
      setSendingTest(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-system-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            phone: testPhone,
            message: generatePreview(editedContent),
            isTest: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to send test SMS');

      toast({
        title: 'Test SMS sent',
        description: `SMS sent to ${testPhone}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test SMS',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.template_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return templates.length;
    return templates.filter(t => t.category === categoryId).length;
  };

  const charInfo = getCharacterInfo(editedContent);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Templates</h2>
          <p className="text-muted-foreground">Manage system SMS templates with character counter</p>
        </div>
        <Button variant="outline" onClick={loadTemplates}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.label}
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {getCategoryCount(cat.id)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="grid gap-4">
            {filteredTemplates.map(template => {
              const info = getCharacterInfo(template.content);
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <MessageSquare className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {template.template_key}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    <div className="bg-muted/50 rounded-md p-3 mb-3">
                      <p className="text-sm font-mono">{template.content}</p>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{info.charCount} characters</span>
                        <span>{info.segments} SMS segment{info.segments > 1 ? 's' : ''}</span>
                        {info.hasUnicode && (
                          <Badge variant="outline" className="text-xs">Unicode</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEditor(template)}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No templates found
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* SMS Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="mt-1.5 min-h-[120px] font-mono text-sm"
                placeholder="Enter SMS content..."
              />
              
              {/* Character Counter */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{charInfo.charCount} / {charInfo.segmentLength} characters</span>
                  <span>{charInfo.segments} segment{charInfo.segments > 1 ? 's' : ''}</span>
                  {charInfo.hasUnicode && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertCircle className="h-3 w-3" />
                      Unicode detected (shorter segments)
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {charInfo.remaining} chars until next segment
                </span>
              </div>
            </div>

            {/* Variables */}
            <div>
              <Label className="text-xs">Available Variables (click to insert)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTemplate?.variables.map((v) => (
                  <Button
                    key={v.name}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertVariable(v.name)}
                  >
                    <Variable className="h-3 w-3 mr-1" />
                    {`{${v.name}}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label className="text-xs">Preview</Label>
              <div className="mt-1.5 p-3 bg-muted rounded-md">
                <p className="text-sm">{generatePreview(editedContent)}</p>
              </div>
            </div>

            {/* Test SMS */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs">Send Test SMS</Label>
                <Input
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button 
                onClick={handleSendTest}
                disabled={!testPhone || sendingTest}
              >
                {sendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
