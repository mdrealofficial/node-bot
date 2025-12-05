import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: 'facebook' | 'instagram';
  token: string;
}

interface Subscriber {
  id: string;
  subscriber_psid?: string;
  subscriber_instagram_id?: string;
  subscriber_name: string;
  last_interaction_time: string | null;
}

interface NewBroadcastFormProps {
  onSuccess?: () => void;
}

const NewBroadcastForm = ({ onSuccess }: NewBroadcastFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountType, setAccountType] = useState<'facebook' | 'instagram'>('facebook');
  const [message, setMessage] = useState('');
  const [activeRecipientsCount, setActiveRecipientsCount] = useState(0);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [sendMode, setSendMode] = useState<'now' | 'later'>('now');

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadSubscribers();
    }
  }, [selectedAccount]);

  useEffect(() => {
    const activeCount = subscribers.filter(subscriber => {
      const lastInteraction = subscriber.last_interaction_time 
        ? new Date(subscriber.last_interaction_time)
        : null;
      const hoursSinceInteraction = lastInteraction 
        ? (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60)
        : Infinity;
      return hoursSinceInteraction < 24;
    }).length;
    setActiveRecipientsCount(activeCount);
  }, [subscribers]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data: fbPages, error: fbError } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      const { data: igAccounts, error: igError } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (fbError) throw fbError;
      if (igError) throw igError;

      const allAccounts: Account[] = [
        ...(fbPages || []).map(p => ({
          id: p.id,
          name: `${p.page_name} (Facebook)`,
          type: 'facebook' as const,
          token: p.page_access_token,
        })),
        ...(igAccounts || []).map(a => ({
          id: a.id,
          name: `@${a.instagram_username} (Instagram)`,
          type: 'instagram' as const,
          token: a.access_token,
        })),
      ];

      setAccounts(allAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) return;

      setAccountType(account.type);

      if (account.type === 'facebook') {
        const { data, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('page_id', selectedAccount)
          .eq('user_id', user?.id);

        if (error) throw error;
        setSubscribers(data || []);
      } else {
        const { data, error } = await supabase
          .from('instagram_subscribers')
          .select('*')
          .eq('instagram_account_id', selectedAccount)
          .eq('user_id', user?.id);

        if (error) throw error;
        setSubscribers(data || []);
      }
    } catch (error) {
      console.error('Error loading subscribers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscribers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedAccount || !message.trim() || activeRecipientsCount === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select an account, enter a message. No active recipients available.',
        variant: 'destructive',
      });
      return;
    }

    if (sendMode === 'later') {
      if (!scheduledDate || !scheduledTime) {
        toast({
          title: 'Validation Error',
          description: 'Please select date and time for scheduled broadcast',
          variant: 'destructive',
        });
        return;
      }

      const [hours, minutes] = scheduledTime.split(':');
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (scheduledDateTime <= new Date()) {
        toast({
          title: 'Validation Error',
          description: 'Scheduled time must be in the future',
          variant: 'destructive',
        });
        return;
      }
    }

    setSending(true);
    try {
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Account not found');

      if (sendMode === 'later' && scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':');
        const scheduledDateTime = new Date(scheduledDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const { error: scheduleError } = await supabase
          .from('scheduled_broadcasts')
          .insert({
            user_id: user?.id,
            account_id: selectedAccount,
            account_type: account.type,
            message: message.trim(),
            scheduled_for: scheduledDateTime.toISOString(),
            timezone,
            active_recipients_count: activeRecipientsCount,
          });

        if (scheduleError) throw scheduleError;

        toast({
          title: 'Broadcast Scheduled',
          description: `Message scheduled for ${format(scheduledDateTime, 'PPp')} (${timezone})`,
        });

        onSuccess?.();
        return;
      }

      const functionName = account.type === 'facebook' 
        ? 'broadcast-message' 
        : 'instagram-broadcast-message';

      const activeSubscriberIds = subscribers
        .filter(subscriber => {
          const lastInteraction = subscriber.last_interaction_time 
            ? new Date(subscriber.last_interaction_time)
            : null;
          const hoursSinceInteraction = lastInteraction 
            ? (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60)
            : Infinity;
          return hoursSinceInteraction < 24;
        })
        .map(s => s.subscriber_psid || s.subscriber_instagram_id || '');

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: account.type === 'facebook' 
          ? {
              pageAccessToken: account.token,
              pageId: selectedAccount,
              message: message.trim(),
              subscriberPsids: activeSubscriberIds,
            }
          : {
              accountId: selectedAccount,
              accessToken: account.token,
              message: message.trim(),
              subscriberInstagramIds: activeSubscriberIds,
            },
      });

      if (error) throw error;

      const hasErrors = data.failureCount > 0;
      const hasSuccess = data.successCount > 0;

      if (hasSuccess && !hasErrors) {
        toast({
          title: 'Broadcast Sent',
          description: `Message sent to ${data.successCount} subscriber(s)`,
        });
      } else if (hasSuccess && hasErrors) {
        toast({
          title: 'Partially Sent',
          description: `Sent to ${data.successCount} subscribers. ${data.failureCount} failed.`,
        });
      } else if (!hasSuccess && hasErrors) {
        const errorMsg = data.errors?.[0] || 'All messages failed';
        const isWindowError = errorMsg.includes('outside of allowed window');
        
        toast({
          title: 'Broadcast Failed',
          description: isWindowError 
            ? `Messages blocked by Facebook's 24-hour policy.`
            : `Failed to send: ${errorMsg}`,
          variant: 'destructive',
        });
      }

      if (hasSuccess) {
        // Save immediate broadcast to history
        const { error: historyError } = await supabase
          .from('scheduled_broadcasts')
          .insert({
            user_id: user?.id,
            account_id: selectedAccount,
            account_type: account.type,
            message: message.trim(),
            scheduled_for: new Date().toISOString(),
            timezone,
            active_recipients_count: activeRecipientsCount,
            status: 'sent',
            sent_count: data.successCount,
            failed_count: data.failureCount,
          });

        if (historyError) {
          console.error('Error saving broadcast history:', historyError);
        }

        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Broadcast Failed',
        description: error.message || 'Failed to send broadcast message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (accounts.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No accounts connected. Please connect a Facebook page or Instagram account first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-md text-xs">
        <strong>⚠️ 24-Hour Policy:</strong> You can only send messages to users who have interacted with your account within the last 24 hours.
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-select">Select Account</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger id="account-select">
            <SelectValue placeholder="Choose an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAccount && (
        <>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your broadcast message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Recipients</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : subscribers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscribers found for this account.</p>
            ) : (
              <div className="border rounded-md p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Subscribers:</span>
                  <span className="text-sm">{subscribers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-600">Active Recipients:</span>
                  <span className="text-sm font-semibold text-green-600">{activeRecipientsCount}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only active recipients will receive the broadcast
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Send Mode</Label>
            <Select value={sendMode} onValueChange={(value: 'now' | 'later') => setSendMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Send Now</SelectItem>
                <SelectItem value="later">Schedule for Later</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sendMode === 'later' && (
            <>
              <div className="space-y-2">
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time">Schedule Time</Label>
                <input
                  id="schedule-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={handleBroadcast}
            disabled={sending || !message.trim() || activeRecipientsCount === 0}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {sendMode === 'later' ? 'Scheduling...' : 'Sending...'}
              </>
            ) : (
              <>
                {sendMode === 'later' ? <Clock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {sendMode === 'later' ? 'Schedule Broadcast' : `Send to ${activeRecipientsCount} Active Recipients`}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default NewBroadcastForm;
