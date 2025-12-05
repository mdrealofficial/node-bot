import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import NewBroadcastForm from './NewBroadcastForm';

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
  page_access_token: string;
}

interface InstagramAccount {
  id: string;
  account_name: string;
  instagram_username: string;
  access_token: string;
}

interface BroadcastHistory {
  id: string;
  account_id: string;
  account_type: 'facebook' | 'instagram';
  message: string;
  scheduled_for: string;
  timezone: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  active_recipients_count: number;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
  account_name?: string;
}

const Broadcast = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastHistory[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadBroadcasts();
    }
  }, [user]);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      // Get broadcasts
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('scheduled_broadcasts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (broadcastError) throw broadcastError;

      // Get account names
      const { data: fbPages } = await supabase
        .from('facebook_pages')
        .select('id, page_name')
        .eq('user_id', user?.id);

      const { data: igAccounts } = await supabase
        .from('instagram_accounts')
        .select('id, instagram_username')
        .eq('user_id', user?.id);

      // Map account names
      const enrichedBroadcasts: BroadcastHistory[] = (broadcastData || []).map(broadcast => {
        let accountName = 'Unknown Account';
        if (broadcast.account_type === 'facebook') {
          const page = fbPages?.find(p => p.id === broadcast.account_id);
          accountName = page?.page_name || accountName;
        } else {
          const account = igAccounts?.find(a => a.id === broadcast.account_id);
          accountName = account ? `@${account.instagram_username}` : accountName;
        }
        return { 
          ...broadcast, 
          account_type: broadcast.account_type as 'facebook' | 'instagram',
          status: broadcast.status as 'pending' | 'sent' | 'failed' | 'cancelled',
          account_name: accountName 
        };
      });

      setBroadcasts(enrichedBroadcasts);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load broadcast history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'pending':
        return <Badge className="bg-blue-600"><ClockIcon className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleBroadcastSuccess = () => {
    setSheetOpen(false);
    loadBroadcasts();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Broadcast History</CardTitle>
            <CardDescription>View and manage your broadcast messages</CardDescription>
          </div>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Broadcast
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>New Broadcast</SheetTitle>
                <SheetDescription>
                  Send messages to your active subscribers
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <NewBroadcastForm onSuccess={handleBroadcastSuccess} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No broadcasts yet</p>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Send Your First Broadcast
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>New Broadcast</SheetTitle>
                  <SheetDescription>
                    Send messages to your active subscribers
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <NewBroadcastForm onSuccess={handleBroadcastSuccess} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{broadcast.account_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{broadcast.account_type}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={broadcast.message}>
                        {broadcast.message.length > 50 
                          ? `${broadcast.message.substring(0, 50)}...` 
                          : broadcast.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(broadcast.scheduled_for), 'PPp')}
                      </div>
                      <div className="text-xs text-muted-foreground">{broadcast.timezone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{broadcast.active_recipients_count} active</div>
                    </TableCell>
                    <TableCell>
                      {broadcast.status === 'sent' && (
                        <div className="text-sm">
                          <div className="text-green-600">{broadcast.sent_count} sent</div>
                          {broadcast.failed_count > 0 && (
                            <div className="text-red-600">{broadcast.failed_count} failed</div>
                          )}
                        </div>
                      )}
                      {broadcast.status === 'failed' && broadcast.error_message && (
                        <div className="text-xs text-red-600" title={broadcast.error_message}>
                          {broadcast.error_message.length > 30 
                            ? `${broadcast.error_message.substring(0, 30)}...` 
                            : broadcast.error_message}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Broadcast;
