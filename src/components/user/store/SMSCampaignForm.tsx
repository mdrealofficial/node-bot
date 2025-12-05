import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomerFilters } from './CustomerFilters';

interface SMSCampaignFormProps {
  storeId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface Filters {
  delivery_location?: string;
  areas?: string[];
  min_orders?: number;
  max_orders?: number;
  min_spent?: number;
  max_spent?: number;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export function SMSCampaignForm({ storeId, onCancel, onSuccess }: SMSCampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sendType, setSendType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [matchingCustomers, setMatchingCustomers] = useState(0);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    loadStoreInfo();
  }, [storeId]);

  useEffect(() => {
    loadMatchingCustomers();
  }, [filters, storeId]);

  const loadStoreInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('name, slug')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setStoreName(data.name);
    } catch (error) {
      console.error('Error loading store info:', error);
    }
  };

  const loadMatchingCustomers = async () => {
    try {
      let query = supabase
        .from('store_customers')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId);

      if (filters.delivery_location) {
        query = query.eq('delivery_location', filters.delivery_location);
      }
      if (filters.areas && filters.areas.length > 0) {
        query = query.in('area', filters.areas);
      }
      if (filters.min_orders !== undefined) {
        query = query.gte('total_orders', filters.min_orders);
      }
      if (filters.max_orders !== undefined) {
        query = query.lte('total_orders', filters.max_orders);
      }
      if (filters.min_spent !== undefined) {
        query = query.gte('total_spent', filters.min_spent);
      }
      if (filters.max_spent !== undefined) {
        query = query.lte('total_spent', filters.max_spent);
      }
      if (filters.date_from) {
        query = query.gte('first_order_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('last_order_at', filters.date_to);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { count, error } = await query;

      if (error) throw error;
      setMatchingCustomers(count || 0);
    } catch (error) {
      console.error('Error loading matching customers:', error);
    }
  };

  const handleSend = async () => {
    if (!name || !message) {
      toast.error('Please fill in campaign name and message');
      return;
    }

    if (matchingCustomers === 0) {
      toast.error('No customers match your filters');
      return;
    }

    setLoading(true);
    try {
      const campaignData: any = {
        store_id: storeId,
        name,
        message: replaceVariables(message),
        status: sendType === 'now' ? 'sending' : 'scheduled',
        filters,
        total_recipients: matchingCustomers,
      };

      if (sendType === 'scheduled' && scheduledDate && scheduledTime) {
        campaignData.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
      }

      const { data: campaign, error: campaignError } = await supabase
        .from('store_sms_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) throw campaignError;

      if (sendType === 'now') {
        // Trigger SMS sending via edge function
        const { error: sendError } = await supabase.functions.invoke('store-send-sms', {
          body: {
            storeId,
            campaignId: campaign.id,
            filters,
          }
        });

        if (sendError) throw sendError;
        toast.success('Campaign is being sent!');
      } else {
        toast.success('Campaign scheduled successfully!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/{store_name}/g, storeName)
      .replace(/{store_url}/g, `${window.location.origin}/store/${storeId}`);
  };

  const getCharCount = () => {
    const replaced = replaceVariables(message);
    return replaced.length;
  };

  const getSMSParts = () => {
    const charCount = getCharCount();
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153);
  };

  const estimatedCost = matchingCustomers * getSMSParts() * 0.25; // ৳0.25 per SMS part

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New SMS Campaign</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign Name *</Label>
          <Input
            id="campaign-name"
            placeholder="e.g., Eid Sale Announcement"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message * (160 chars per SMS)</Label>
          <Textarea
            id="message"
            placeholder="🎉 Eid Mubarak! Get 30% OFF on all products. Use code: EID30. Shop now: {store_url}"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Characters: {getCharCount()}/160 | SMS Parts: {getSMSParts()}</span>
            <span>Variables: {'{name}'} {'{store_name}'} {'{store_url}'}</span>
          </div>
        </div>

        <CustomerFilters 
          storeId={storeId}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Matching Customers:</span>
            </div>
            <span className="text-2xl font-bold text-primary">{matchingCustomers}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Estimated Cost: {matchingCustomers} × {getSMSParts()} SMS = ৳{estimatedCost.toFixed(2)}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <Label>Schedule</Label>
          <RadioGroup value={sendType} onValueChange={(value) => setSendType(value as 'now' | 'scheduled')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="now" />
              <Label htmlFor="now">Send Now</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="scheduled" />
              <Label htmlFor="scheduled">Schedule for Later</Label>
            </div>
          </RadioGroup>

          {sendType === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || !name || !message || matchingCustomers === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {sendType === 'now' ? 'Sending...' : 'Scheduling...'}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {sendType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}