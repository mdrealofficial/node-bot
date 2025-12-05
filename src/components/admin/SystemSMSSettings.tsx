import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
const SMS_GATEWAY_PRESETS = {
  mimsms: {
    name: 'MiMSMS',
    endpoint: 'https://esms.mimsms.com/smsapi',
    method: 'get',
    apiKeyParam: 'api_key',
    phoneParam: 'contacts',
    messageParam: 'msg',
    senderIdParam: 'senderid'
  },
  smsnetbd: {
    name: 'SMS.NET.BD',
    endpoint: 'https://api.sms.net.bd/sendsms',
    method: 'post',
    apiKeyParam: 'api_key',
    phoneParam: 'to',
    messageParam: 'msg',
    senderIdParam: 'sender_id'
  },
  bulksmsbd: {
    name: 'BulkSMSBD.com',
    endpoint: 'https://bulksmsbd.com/api/smsapi',
    method: 'get',
    apiKeyParam: 'api_key',
    phoneParam: 'number',
    messageParam: 'message',
    senderIdParam: 'senderid'
  },
  custom: {
    name: 'Custom Gateway',
    endpoint: '',
    method: 'get',
    apiKeyParam: 'api_key',
    phoneParam: 'to',
    messageParam: 'msg',
    senderIdParam: 'sender_id'
  }
};
export default function SystemSMSSettings() {
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // Settings state
  const [enabled, setEnabled] = useState(false);
  const [gatewayPreset, setGatewayPreset] = useState('custom');
  const [gatewayType, setGatewayType] = useState('get');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyParam, setApiKeyParam] = useState('api_key');
  const [phoneParam, setPhoneParam] = useState('to');
  const [messageParam, setMessageParam] = useState('msg');
  const [senderId, setSenderId] = useState('');
  const [senderIdParam, setSenderIdParam] = useState('sender_id');
  const [additionalParams, setAdditionalParams] = useState('{}');
  const [successResponse, setSuccessResponse] = useState('');
  useEffect(() => {
    loadSettings();
  }, []);
  const loadSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('admin_config').select('*').single();
      if (error) throw error;
      if (data) {
        setEnabled(data.system_sms_enabled || false);
        setGatewayPreset(data.system_sms_gateway_preset || 'custom');
        setGatewayType(data.system_sms_gateway_type || 'get');
        setEndpoint(data.system_sms_gateway_endpoint || '');
        setApiKey(data.system_sms_api_key || '');
        setApiKeyParam(data.system_sms_api_key_param || 'api_key');
        setPhoneParam(data.system_sms_phone_param || 'to');
        setMessageParam(data.system_sms_message_param || 'msg');
        setSenderId(data.system_sms_sender_id || '');
        setSenderIdParam(data.system_sms_sender_id_param || 'sender_id');
        setAdditionalParams(JSON.stringify(data.system_sms_additional_params || {}));
        setSuccessResponse(data.system_sms_success_response || '');
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };
  const handlePresetChange = (preset: string) => {
    setGatewayPreset(preset);
    const presetConfig = SMS_GATEWAY_PRESETS[preset as keyof typeof SMS_GATEWAY_PRESETS];
    if (presetConfig) {
      setGatewayType(presetConfig.method);
      if (preset !== 'custom') {
        setEndpoint(presetConfig.endpoint);
      }
      setApiKeyParam(presetConfig.apiKeyParam);
      setPhoneParam(presetConfig.phoneParam);
      setMessageParam(presetConfig.messageParam);
      setSenderIdParam(presetConfig.senderIdParam);
    }
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(additionalParams);
      } catch {
        toast({
          title: 'Error',
          description: 'Invalid JSON in additional parameters',
          variant: 'destructive'
        });
        return;
      }
      const {
        error
      } = await supabase.from('admin_config').update({
        system_sms_enabled: enabled,
        system_sms_gateway_preset: gatewayPreset,
        system_sms_gateway_type: gatewayType,
        system_sms_gateway_endpoint: endpoint,
        system_sms_api_key: apiKey,
        system_sms_api_key_param: apiKeyParam,
        system_sms_phone_param: phoneParam,
        system_sms_message_param: messageParam,
        system_sms_sender_id: senderId,
        system_sms_sender_id_param: senderIdParam,
        system_sms_additional_params: parsedParams,
        system_sms_success_response: successResponse
      }).not('id', 'is', null);
      if (error) throw error;
      toast({
        title: 'Saved',
        description: 'SMS settings saved successfully',
        duration: 3000
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  };
  const handleTest = async () => {
    if (!testPhone) {
      toast({
        title: 'Error',
        description: 'Enter a phone number to test',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(additionalParams);
      } catch {
        parsedParams = {};
      }
      const params: Record<string, string> = {
        [phoneParam]: testPhone,
        [messageParam]: 'Test message from System SMS Gateway'
      };
      if (apiKey) {
        params[apiKeyParam] = apiKey;
      }
      if (senderId) {
        params[senderIdParam] = senderId;
      }
      Object.assign(params, parsedParams);
      const url = gatewayType === 'get' ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      const response = await fetch(url, {
        method: gatewayType.toUpperCase(),
        headers: gatewayType === 'post' ? {
          'Content-Type': 'application/json'
        } : {},
        body: gatewayType === 'post' ? JSON.stringify(params) : undefined
      });
      const result = await response.text();
      const success = successResponse ? result.includes(successResponse) : response.ok;
      setTestResult(success ? 'success' : 'failed');
      toast({
        title: success ? 'Test Successful' : 'Test Failed',
        description: success ? 'SMS sent successfully' : `Response: ${result.substring(0, 100)}`,
        variant: success ? 'default' : 'destructive',
        duration: 3000
      });
    } catch (error: any) {
      setTestResult('failed');
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setTesting(false);
    }
  };
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Card>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable System SMS</Label>
              <p className="text-sm text-muted-foreground">Send system notifications via SMS</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && <>
              <div className="space-y-4">
                <div>
                  <Label>SMS Gateway Provider</Label>
                  <Select value={gatewayPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SMS_GATEWAY_PRESETS).map(([key, preset]) => <SelectItem key={key} value={key}>{preset.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {gatewayPreset !== 'custom' ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>API Key</Label>
                      <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API key" />
                    </div>
                    <div>
                      <Label>Sender ID (Optional)</Label>
                      <Input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="e.g., MYAPP" />
                    </div>
                  </div> : <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Request Method</Label>
                        <Select value={gatewayType} onValueChange={setGatewayType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="get">GET</SelectItem>
                            <SelectItem value="post">POST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>API Endpoint</Label>
                        <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.example.com/sms" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>API Key</Label>
                        <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API key" />
                      </div>
                      <div>
                        <Label>API Key Parameter Name</Label>
                        <Input value={apiKeyParam} onChange={e => setApiKeyParam(e.target.value)} placeholder="api_key" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Phone Number Parameter</Label>
                        <Input value={phoneParam} onChange={e => setPhoneParam(e.target.value)} placeholder="to" />
                      </div>
                      <div>
                        <Label>Message Parameter</Label>
                        <Input value={messageParam} onChange={e => setMessageParam(e.target.value)} placeholder="msg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Sender ID</Label>
                        <Input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="e.g., MYAPP" />
                      </div>
                      <div>
                        <Label>Sender ID Parameter</Label>
                        <Input value={senderIdParam} onChange={e => setSenderIdParam(e.target.value)} placeholder="sender_id" />
                      </div>
                    </div>

                    <div>
                      <Label>Additional Parameters (JSON)</Label>
                      <Textarea value={additionalParams} onChange={e => setAdditionalParams(e.target.value)} placeholder='{"type": "text"}' className="font-mono text-sm" />
                    </div>

                    <div>
                      <Label>Success Response Indicator</Label>
                      <Input value={successResponse} onChange={e => setSuccessResponse(e.target.value)} placeholder="e.g., success, sent, 200" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Text that indicates successful delivery in the API response
                      </p>
                    </div>
                  </>}
              </div>

              <div className="border-t pt-4">
                <Label>Test SMS</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" className="max-w-xs" />
                  <Button onClick={handleTest} disabled={testing} variant="outline">
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Send Test
                  </Button>
                  {testResult === 'success' && <CheckCircle className="h-5 w-5 text-green-500 self-center" />}
                  {testResult === 'failed' && <XCircle className="h-5 w-5 text-destructive self-center" />}
                </div>
              </div>
            </>}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}