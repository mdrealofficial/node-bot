import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Copy, Check, ExternalLink, RefreshCw, Trash2, Link } from 'lucide-react';
import { format } from 'date-fns';

interface DeletionRequest {
  id: string;
  facebook_user_id: string;
  confirmation_code: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  deletion_details: Record<string, boolean> | null;
}

const DataDeletionSettings = () => {
  const [callbackUrl, setCallbackUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminConfig, setAdminConfig] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get admin config
      const { data: config } = await supabase
        .from('admin_config')
        .select('site_url, app_domain, data_deletion_callback_url')
        .single();

      setAdminConfig(config);

      // Build callback URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/facebook-data-deletion`;
      setCallbackUrl(url);

      // Load deletion requests
      const { data: requestsData, error } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(50);

      if (!error && requestsData) {
        setRequests(requestsData as DeletionRequest[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    toast.success('Callback URL copied!', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const saveCallbackUrl = async () => {
    try {
      const { error } = await supabase
        .from('admin_config')
        .update({ data_deletion_callback_url: callbackUrl })
        .eq('id', adminConfig?.id || 'default');

      if (error) throw error;
      toast.success('Callback URL saved!', { duration: 2000 });
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message, { duration: 3000 });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Facebook Data Deletion</h2>
        <p className="text-muted-foreground">Configure and monitor Facebook data deletion callbacks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Data Deletion Callback URL
          </CardTitle>
          <CardDescription>
            Configure this URL in your Facebook App's Data Deletion settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={callbackUrl} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">Setup Instructions:</h4>
            <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Go to your <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Facebook App Dashboard <ExternalLink className="inline h-3 w-3" /></a></li>
              <li>Navigate to <strong>Settings → Basic</strong></li>
              <li>Scroll down to <strong>Data Deletion</strong> section</li>
              <li>Select <strong>"Data Deletion Callback URL"</strong></li>
              <li>Paste the callback URL above</li>
              <li>Save changes</li>
            </ol>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Important:</strong> Facebook requires all apps using Facebook Login to provide a data deletion callback URL. 
              This ensures GDPR/CCPA compliance by allowing users to request deletion of their data through Facebook.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deletion Requests</CardTitle>
            <CardDescription>Recent data deletion requests from Facebook</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deletion requests yet</p>
              <p className="text-sm">Requests will appear here when users request data deletion through Facebook</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Confirmation Code</TableHead>
                  <TableHead>Facebook User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">{request.confirmation_code}</TableCell>
                    <TableCell className="font-mono text-sm">{request.facebook_user_id}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      {request.completed_at 
                        ? format(new Date(request.completed_at), 'MMM d, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Gets Deleted</CardTitle>
          <CardDescription>When a user requests data deletion, the following data is removed</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Subscriber profiles and messenger data</li>
            <li>All message history and conversations</li>
            <li>Comment reply history</li>
            <li>Store customer records linked to Facebook</li>
            <li>Broadcast recipient records</li>
            <li>Any other data associated with the Facebook User ID</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDeletionSettings;
