import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Send, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SMTP_PRESETS = {
  gmail: {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  outlook: {
    name: 'Outlook/Office 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
  },
  sendgrid: {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
  },
  mailgun: {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
  },
  resend: {
    name: 'Resend',
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
  },
  custom: {
    name: 'Custom SMTP',
    host: '',
    port: 587,
    secure: false,
  },
};

export default function SystemSMTPSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [smtpPreset, setSmtpPreset] = useState('custom');

  // Settings state
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('System');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setEnabled(data.system_smtp_enabled || false);
        setHost(data.system_smtp_host || '');
        setPort(data.system_smtp_port || 587);
        setSecure(data.system_smtp_secure ?? true);
        setUsername(data.system_smtp_username || '');
        setPassword(data.system_smtp_password || '');
        setFromEmail(data.system_smtp_from_email || '');
        setFromName(data.system_smtp_from_name || 'System');

        // Detect preset
        const detectedPreset = Object.entries(SMTP_PRESETS).find(
          ([key, preset]) => key !== 'custom' && preset.host === data.system_smtp_host
        );
        if (detectedPreset) {
          setSmtpPreset(detectedPreset[0]);
        }
      }
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSmtpPreset(preset);
    const presetConfig = SMTP_PRESETS[preset as keyof typeof SMTP_PRESETS];
    if (presetConfig && preset !== 'custom') {
      setHost(presetConfig.host);
      setPort(presetConfig.port);
      setSecure(presetConfig.secure);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('admin_config')
        .update({
          system_smtp_enabled: enabled,
          system_smtp_host: host,
          system_smtp_port: port,
          system_smtp_secure: secure,
          system_smtp_username: username,
          system_smtp_password: password,
          system_smtp_from_email: fromEmail,
          system_smtp_from_name: fromName,
        })
        .not('id', 'is', null);

      if (error) throw error;

      toast({ title: 'Saved', description: 'SMTP settings saved successfully', duration: 3000 });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast({ title: 'Error', description: 'Enter an email address to test', variant: 'destructive', duration: 3000 });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-system-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from System SMTP',
          html: '<h1>Test Email</h1><p>This is a test email from your system SMTP configuration.</p>',
          isTest: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast({ title: 'Test Successful', description: 'Test email sent successfully', duration: 3000 });
      } else {
        throw new Error(data?.error || 'Failed to send test email');
      }
    } catch (error: any) {
      setTestResult('failed');
      toast({ title: 'Test Failed', description: error.message, variant: 'destructive', duration: 3000 });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            System SMTP Configuration
          </CardTitle>
          <CardDescription>
            Configure SMTP for system emails, notifications, password resets, and verification emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable System SMTP</Label>
              <p className="text-sm text-muted-foreground">Use custom SMTP for system emails</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>SMTP Provider</Label>
                  <Select value={smtpPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SMTP_PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="smtp.example.com"
                      disabled={smtpPreset !== 'custom'}
                    />
                  </div>
                  <div>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                      placeholder="587"
                      disabled={smtpPreset !== 'custom'}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={secure}
                      onCheckedChange={setSecure}
                      disabled={smtpPreset !== 'custom'}
                    />
                    <Label>Use SSL/TLS</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username / Email</Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Password / App Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>From Email</Label>
                    <Input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div>
                    <Label>From Name</Label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="System"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Test Email</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="max-w-xs"
                  />
                  <Button onClick={handleTest} disabled={testing} variant="outline">
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Send Test
                  </Button>
                  {testResult === 'success' && <CheckCircle className="h-5 w-5 text-green-500 self-center" />}
                  {testResult === 'failed' && <XCircle className="h-5 w-5 text-destructive self-center" />}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Gmail requires an App Password. Enable 2FA and create one at Google Account → Security → App Passwords
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}