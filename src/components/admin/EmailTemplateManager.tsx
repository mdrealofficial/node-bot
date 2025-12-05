import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, Edit, Eye, Search, Loader2, Send, Code, Monitor, 
  Variable, RefreshCw, Copy, ChevronLeft
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_key: string;
  category: string;
  name: string;
  description: string | null;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: { name: string; description: string }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  { id: 'all', label: 'All Templates' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'auth', label: 'Authentication' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'payment', label: 'Payment' },
  { id: 'notification', label: 'Notification' },
  { id: 'account', label: 'Account' },
];

export default function EmailTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [appName, setAppName] = useState('FB SmartReply');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        .from('system_email_templates')
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
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('system_email_templates')
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

  const openEditor = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedHtml(template.html_content);
    setPreviewHtml(generatePreview(template.html_content, template.variables));
    setIsEditorOpen(true);
  };

  const generatePreview = (html: string, variables: { name: string; description: string }[]) => {
    let preview = html;
    const sampleData: Record<string, string> = {
      user_name: 'John Doe',
      app_name: appName,
      dashboard_url: window.location.origin + '/dashboard',
      current_year: new Date().getFullYear().toString(),
      verification_code: '123456',
      verification_url: window.location.origin + '/verify',
      expiry_minutes: '15',
      expiry_hours: '24',
      reset_url: 'https://example.com/reset',
      ip_address: '192.168.1.1',
      request_time: new Date().toLocaleString(),
      change_time: new Date().toLocaleString(),
      support_url: 'https://example.com/support',
      code: '847291',
      plan_name: 'Pro Plan',
      amount: '৳999',
      billing_cycle: 'month',
      features_list: '<li>Feature 1</li><li>Feature 2</li><li>Feature 3</li>',
      reply_quota: '1000',
      next_billing_date: '2024-02-01',
      period_start: '2024-01-01',
      period_end: '2024-01-31',
      invoice_url: 'https://example.com/invoice/123',
      access_end_date: '2024-01-31',
      resubscribe_url: 'https://example.com/subscribe',
      feedback_url: 'https://example.com/feedback',
      days_remaining: '7',
      expiry_date: '2024-01-31',
      renew_url: 'https://example.com/renew',
      transaction_id: 'TXN-123456',
      description: 'Pro Plan Subscription',
      payment_method: 'bKash',
      payment_date: new Date().toLocaleDateString(),
      error_message: 'Insufficient funds',
      attempt_date: new Date().toLocaleDateString(),
      update_payment_url: 'https://example.com/payment',
      invoice_number: 'INV-001',
      invoice_date: new Date().toLocaleDateString(),
      customer_name: 'Jane Smith',
      customer_phone: '+8801712345678',
      items_html: '<tr><td>Product 1</td><td>2</td><td>৳500</td><td>৳1000</td></tr>',
      subtotal: '৳1000',
      shipping: '৳60',
      discount: '৳100',
      total: '৳960',
      payment_url: 'https://example.com/pay/123',
      store_name: 'My Store',
      store_phone: '+8801712345678',
      usage_percent: '85',
      replies_used: '850',
      replies_remaining: '150',
      reset_days: '5',
      upgrade_url: 'https://example.com/upgrade',
      feature_name: 'AI Assistant',
      feature_description: 'Our new AI assistant helps automate your workflows.',
      feature_url: 'https://example.com/features/ai',
      suspension_reason: 'Terms of service violation',
      appeal_url: 'https://example.com/appeal',
      trial_days: '14',
      start_date: new Date().toLocaleDateString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    };

    variables.forEach(v => {
      const regex = new RegExp(`\\{${v.name}\\}`, 'g');
      preview = preview.replace(regex, sampleData[v.name] || `[${v.name}]`);
    });

    return preview;
  };

  const handleHtmlChange = (newHtml: string) => {
    setEditedHtml(newHtml);
    if (selectedTemplate) {
      setPreviewHtml(generatePreview(newHtml, selectedTemplate.variables));
    }
  };

  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`;
    setEditedHtml(prev => prev + variable);
    if (selectedTemplate) {
      setPreviewHtml(generatePreview(editedHtml + variable, selectedTemplate.variables));
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_email_templates')
        .update({
          subject: editedSubject,
          html_content: editedHtml,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t =>
        t.id === selectedTemplate.id 
          ? { ...t, subject: editedSubject, html_content: editedHtml }
          : t
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
    if (!testEmail || !selectedTemplate) return;

    try {
      setSendingTest(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-system-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: testEmail,
            subject: editedSubject.replace(/{app_name}/g, 'Test App'),
            html: previewHtml,
            isTest: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to send test email');

      toast({
        title: 'Test email sent',
        description: `Email sent to ${testEmail}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email',
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
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Manage system email templates with HTML editor</p>
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
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
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
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="font-medium">Subject:</span>
                    <span className="truncate">{template.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditor(template)}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setSelectedTemplate(template);
                      setPreviewHtml(generatePreview(template.html_content, template.variables));
                      setIsPreviewOpen(true);
                    }}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No templates found
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 border rounded-lg">
            <div 
              className="p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </ScrollArea>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Edit: {selectedTemplate?.name}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Editor Panel */}
            <div className="flex-1 flex flex-col border-r">
              <div className="p-4 border-b space-y-3">
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={editorMode === 'visual' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('visual')}
                  >
                    <Monitor className="h-3.5 w-3.5 mr-1.5" />
                    Visual
                  </Button>
                  <Button
                    size="sm"
                    variant={editorMode === 'code' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('code')}
                  >
                    <Code className="h-3.5 w-3.5 mr-1.5" />
                    HTML Code
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {editorMode === 'code' ? (
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => handleHtmlChange(e.target.value)}
                    className="h-full w-full resize-none rounded-none border-0 font-mono text-xs"
                    placeholder="Enter HTML content..."
                  />
                ) : (
                  <ScrollArea className="h-full">
                    <div 
                      className="p-4"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Variables Panel */}
            <div className="w-64 flex flex-col bg-muted/30">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Variable className="h-4 w-4" />
                  Variables
                </h4>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {selectedTemplate?.variables.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => insertVariable(v.name)}
                      className="w-full text-left p-2 rounded-md bg-background hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-medium text-primary">{`{${v.name}}`}</code>
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Test Email */}
              <div className="p-3 border-t space-y-3">
                <Label className="text-xs">Send Test Email</Label>
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="text-xs"
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleSendTest}
                  disabled={!testEmail || sendingTest}
                >
                  {sendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Send Test
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
