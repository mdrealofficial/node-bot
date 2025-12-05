import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Send, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SMS_GATEWAY_PRESETS = {
  custom: {
    name: 'Custom Gateway',
    endpoint: '',
    method: 'post',
    api_key_param: 'apikey',
    message_param: 'message',
    phone_param: 'to',
    additional_params: [],
  },
  mimsms: {
    name: 'MiMSMS',
    endpoint: 'https://api.mimsms.com/api/SmsSending/SMS',
    method: 'post',
    api_key_param: 'ApiKey',
    message_param: 'SmsText',
    phone_param: 'MobileNo',
    additional_params: [
      { key: 'TransactionType', value: 'T' },
    ],
    fields: ['username', 'api_key', 'sender_id'],
  },
  smsnetbd: {
    name: 'SMS.NET.BD',
    endpoint: 'https://api.sms.net.bd/sendsms',
    method: 'get',
    api_key_param: 'api_key',
    message_param: 'msg',
    phone_param: 'to',
    additional_params: [],
    fields: ['api_key', 'sender_id'],
  },
  bulksmsbd: {
    name: 'BulkSMSBD.com',
    endpoint: 'https://api.bulksmsbd.com/api/v1/send',
    method: 'post',
    api_key_param: 'api_key',
    message_param: 'message',
    phone_param: 'number',
    additional_params: [],
    fields: ['api_key', 'sender_id'],
  },
};

interface SMSGatewaySettingsProps {
  storeId: string;
  onUpdate: () => void;
}

interface AdditionalParam {
  key: string;
  value: string;
}

export function SMSGatewaySettings({ storeId, onUpdate }: SMSGatewaySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [gatewayType, setGatewayType] = useState<keyof typeof SMS_GATEWAY_PRESETS>('custom');
  const [gatewayName, setGatewayName] = useState('');
  const [username, setUsername] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState<'get' | 'post'>('post');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyParam, setApiKeyParam] = useState('api_key');
  const [messageParam, setMessageParam] = useState('message');
  const [phoneParam, setPhoneParam] = useState('to');
  const [additionalParams, setAdditionalParams] = useState<AdditionalParam[]>([]);
  const [successResponse, setSuccessResponse] = useState('success');
  const [senderId, setSenderId] = useState('');
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    loadSettings();
  }, [storeId]);

  const handleGatewayTypeChange = (type: keyof typeof SMS_GATEWAY_PRESETS) => {
    setGatewayType(type);
    const preset = SMS_GATEWAY_PRESETS[type];
    
    if (type !== 'custom') {
      setGatewayName(preset.name);
      setEndpoint(preset.endpoint);
      setMethod(preset.method as 'get' | 'post');
      setApiKeyParam(preset.api_key_param);
      setMessageParam(preset.message_param);
      setPhoneParam(preset.phone_param);
      setAdditionalParams(preset.additional_params || []);
      
      // Clear fields that need user input
      setApiKey('');
      setUsername('');
      setSenderId('');
    } else {
      // Reset to default values for custom
      setGatewayName('');
      setEndpoint('');
      setMethod('post');
      setApiKeyParam('apikey');
      setMessageParam('message');
      setPhoneParam('to');
      setAdditionalParams([]);
      setApiKey('');
      setUsername('');
      setSenderId('');
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('sms_gateway_enabled, sms_gateway_name, sms_gateway_username, sms_gateway_type, sms_gateway_endpoint, sms_gateway_api_key, sms_gateway_api_key_param, sms_gateway_phone_param, sms_gateway_message_param, sms_gateway_sender_id, sms_gateway_success_response, sms_gateway_additional_params')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      if (data) {
        setEnabled(data.sms_gateway_enabled || false);
        setGatewayName(data.sms_gateway_name || '');
        setUsername(data.sms_gateway_username || '');
        setEndpoint(data.sms_gateway_endpoint || '');
        setMethod((data.sms_gateway_type as 'get' | 'post') || 'post');
        setApiKey(data.sms_gateway_api_key || '');
        setApiKeyParam(data.sms_gateway_api_key_param || 'api_key');
        setPhoneParam(data.sms_gateway_phone_param || 'to');
        setMessageParam(data.sms_gateway_message_param || 'msg');
        setSenderId(data.sms_gateway_sender_id || '');
        setSuccessResponse(data.sms_gateway_success_response || '');
        
        const params = data.sms_gateway_additional_params as Record<string, string> || {};
        setAdditionalParams(Object.entries(params).map(([key, value]) => ({ key, value })));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load SMS gateway settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params: Record<string, string> = {};
      additionalParams.forEach(param => {
        params[param.key] = param.value;
      });

      const { error } = await supabase
        .from('stores')
        .update({
          sms_gateway_enabled: enabled,
          sms_gateway_name: gatewayName,
          sms_gateway_username: username,
          sms_gateway_endpoint: endpoint,
          sms_gateway_type: method,
          sms_gateway_api_key: apiKey,
          sms_gateway_api_key_param: apiKeyParam,
          sms_gateway_message_param: messageParam,
          sms_gateway_phone_param: phoneParam,
          sms_gateway_additional_params: params,
          sms_gateway_success_response: successResponse,
          sms_gateway_sender_id: senderId,
        })
        .eq('id', storeId);

      if (error) throw error;

      toast.success('SMS gateway settings saved successfully');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-send-sms', {
        body: {
          storeId,
          phoneNumber: testPhone,
          message: 'This is a test message from your SMS gateway configuration.',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(data?.error || 'Failed to send test SMS');
      }
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast.error('Failed to send test SMS');
    } finally {
      setTesting(false);
    }
  };

  const addParam = () => {
    setAdditionalParams([...additionalParams, { key: '', value: '' }]);
  };

  const removeParam = (index: number) => {
    setAdditionalParams(additionalParams.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...additionalParams];
    newParams[index][field] = value;
    setAdditionalParams(newParams);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>SMS Gateway Configuration</CardTitle>
            <CardDescription>Configure your SMS provider for sending campaign messages</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base font-semibold">Enable SMS Gateway</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Turn on to allow SMS campaigns
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-6">
            {/* Gateway Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="gateway_type">SMS Gateway Provider</Label>
              <Select value={gatewayType} onValueChange={handleGatewayTypeChange}>
                <SelectTrigger id="gateway_type">
                  <SelectValue placeholder="Select gateway provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Gateway (Manual Setup)</SelectItem>
                  <SelectItem value="mimsms">MiMSMS</SelectItem>
                  <SelectItem value="smsnetbd">SMS.NET.BD (Alpha SMS)</SelectItem>
                  <SelectItem value="bulksmsbd">BulkSMSBD.com</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {gatewayType === 'custom' 
                  ? 'Configure your own SMS gateway with custom parameters'
                  : 'Pre-configured settings for ' + SMS_GATEWAY_PRESETS[gatewayType].name
                }
              </p>
            </div>

            {/* Preset Gateway Fields */}
            {gatewayType !== 'custom' && (
              <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
                <h3 className="font-semibold text-sm">Gateway Credentials</h3>
                
                {gatewayType === 'mimsms' && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (Email) <span className="text-destructive">*</span></Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key <span className="text-destructive">*</span></Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender_id">Sender ID</Label>
                  <Input
                    id="sender_id"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder="Your brand name"
                  />
                  <p className="text-xs text-muted-foreground">
                    The name that appears as the sender
                  </p>
                </div>
              </div>
            )}

            {/* Custom Gateway Configuration */}
            {gatewayType === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gateway_name">Gateway Name</Label>
                  <Input
                    id="gateway_name"
                    value={gatewayName}
                    onChange={(e) => setGatewayName(e.target.value)}
                    placeholder="My SMS Service"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint URL <span className="text-destructive">*</span></Label>
                  <Input
                    id="endpoint"
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://example.com/sms/send"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Method</Label>
                  <RadioGroup defaultValue={method} onValueChange={(value) => setMethod(value as 'get' | 'post')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="get" id="r1" />
                      <Label htmlFor="r1">GET</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="post" id="r2" />
                      <Label htmlFor="r2">POST</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key_param">API Key Parameter <span className="text-destructive">*</span></Label>
                  <Input
                    id="api_key_param"
                    value={apiKeyParam}
                    onChange={(e) => setApiKeyParam(e.target.value)}
                    placeholder="api_key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key <span className="text-destructive">*</span></Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="YourSecretApiKey"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_param">Phone Number Parameter <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone_param"
                    value={phoneParam}
                    onChange={(e) => setPhoneParam(e.target.value)}
                    placeholder="phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message_param">Message Parameter <span className="text-destructive">*</span></Label>
                  <Input
                    id="message_param"
                    value={messageParam}
                    onChange={(e) => setMessageParam(e.target.value)}
                    placeholder="message"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="success_response">Success Response <span className="text-destructive">*</span></Label>
                  <Input
                    id="success_response"
                    value={successResponse}
                    onChange={(e) => setSuccessResponse(e.target.value)}
                    placeholder="success"
                  />
                  <p className="text-xs text-muted-foreground">
                    The value in the response that indicates a successful SMS send
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Additional Parameters</Label>
                  {additionalParams.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateParam(index, 'value', e.target.value)}
                      />
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeParam(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" size="sm" onClick={addParam}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>
              </div>
            )}

            {/* Test SMS Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <Label className="text-base font-semibold">Test SMS</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Enter phone number (01XXXXXXXXX)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTestSMS} disabled={testing || !apiKey} variant="outline">
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save SMS Gateway Settings'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
