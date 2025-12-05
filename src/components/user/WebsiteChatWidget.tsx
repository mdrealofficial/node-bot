import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Globe, Copy, Settings, Trash2, Code } from 'lucide-react';

interface Widget {
  id: string;
  widget_name: string;
  widget_token: string;
  business_name: string;
  primary_color: string;
  position: string;
  welcome_message: string;
  offline_message: string;
  avatar_url: string | null;
  domain_whitelist: string[];
  auto_response_enabled: boolean;
  auto_response_message: string | null;
  is_active: boolean;
  created_at: string;
}

export default function WebsiteChatWidget() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    widget_name: '',
    business_name: '',
    primary_color: '#6366f1',
    position: 'bottom-right',
    welcome_message: 'Hi! How can we help you today?',
    offline_message: "We're currently offline. Leave us a message!",
    domain_whitelist: '',
    auto_response_enabled: false,
    auto_response_message: '',
  });

  useEffect(() => {
    if (user) {
      fetchWidgets();
    }
  }, [user]);

  const fetchWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('website_widgets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWidget = async () => {
    if (!formData.widget_name || !formData.business_name) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase.from('website_widgets').insert({
        user_id: user?.id,
        widget_name: formData.widget_name,
        business_name: formData.business_name,
        primary_color: formData.primary_color,
        position: formData.position,
        welcome_message: formData.welcome_message,
        offline_message: formData.offline_message,
        domain_whitelist: formData.domain_whitelist
          ? formData.domain_whitelist.split(',').map(d => d.trim()).filter(Boolean)
          : [],
        auto_response_enabled: formData.auto_response_enabled,
        auto_response_message: formData.auto_response_message || null,
      });

      if (error) throw error;

      toast.success('Widget created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchWidgets();
    } catch (error) {
      console.error('Error creating widget:', error);
      toast.error('Failed to create widget');
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const { error } = await supabase
        .from('website_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;

      toast.success('Widget deleted successfully');
      fetchWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast.error('Failed to delete widget');
    }
  };

  const resetForm = () => {
    setFormData({
      widget_name: '',
      business_name: '',
      primary_color: '#6366f1',
      position: 'bottom-right',
      welcome_message: 'Hi! How can we help you today?',
      offline_message: "We're currently offline. Leave us a message!",
      domain_whitelist: '',
      auto_response_enabled: false,
      auto_response_message: '',
    });
  };

  const getEmbedCode = (widgetToken: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s);j.async=1;
    j.src='${supabaseUrl}/functions/v1/website-widget-loader?id='+i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','_lcq','${widgetToken}');
</script>`;
  };

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied to clipboard');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Website Chat Widget</h1>
          <p className="text-muted-foreground mt-1">
            Add live chat to your website and manage conversations
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Widget</DialogTitle>
              <DialogDescription>
                Configure your website chat widget
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="widget_name">Widget Name *</Label>
                <Input
                  id="widget_name"
                  placeholder="My Website Widget"
                  value={formData.widget_name}
                  onChange={(e) => setFormData({ ...formData, widget_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  placeholder="Your Business"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="welcome_message">Welcome Message</Label>
                <Textarea
                  id="welcome_message"
                  value={formData.welcome_message}
                  onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="offline_message">Offline Message</Label>
                <Textarea
                  id="offline_message"
                  value={formData.offline_message}
                  onChange={(e) => setFormData({ ...formData, offline_message: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="domain_whitelist">Domain Whitelist (comma-separated)</Label>
                <Input
                  id="domain_whitelist"
                  placeholder="example.com, subdomain.example.com"
                  value={formData.domain_whitelist}
                  onChange={(e) => setFormData({ ...formData, domain_whitelist: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty to allow all domains
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_response">Auto-Response</Label>
                  <p className="text-sm text-muted-foreground">
                    Send automatic reply to first message
                  </p>
                </div>
                <Switch
                  id="auto_response"
                  checked={formData.auto_response_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_response_enabled: checked })
                  }
                />
              </div>

              {formData.auto_response_enabled && (
                <div>
                  <Label htmlFor="auto_response_message">Auto-Response Message</Label>
                  <Textarea
                    id="auto_response_message"
                    placeholder="Thanks for reaching out! We'll get back to you shortly."
                    value={formData.auto_response_message}
                    onChange={(e) =>
                      setFormData({ ...formData, auto_response_message: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWidget}>Create Widget</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first widget to add live chat to your website
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((widget) => (
            <Card key={widget.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{widget.widget_name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowEmbedDialog(true);
                      }}
                    >
                      <Code className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWidget(widget.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>{widget.business_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: widget.primary_color }}
                  />
                  <span className="text-muted-foreground">
                    {widget.position === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {widget.domain_whitelist?.length > 0
                    ? `${widget.domain_whitelist.length} domain(s) whitelisted`
                    : 'All domains allowed'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copyEmbedCode(getEmbedCode(widget.widget_token))}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Embed Code
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code and paste it before the closing &lt;/body&gt; tag on your website
            </DialogDescription>
          </DialogHeader>
          {selectedWidget && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm break-all">{getEmbedCode(selectedWidget.widget_token)}</code>
              </div>
              <Button
                onClick={() => copyEmbedCode(getEmbedCode(selectedWidget.widget_token))}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}