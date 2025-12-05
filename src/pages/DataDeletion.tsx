import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DeletionStatus {
  confirmation_code: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
}

const DataDeletion = () => {
  const [searchParams] = useSearchParams();
  const [appName, setAppName] = useState('Our Platform');
  const [appDomain, setAppDomain] = useState('');
  const [searchCode, setSearchCode] = useState(searchParams.get('code') || '');
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase.from('admin_config').select('app_name, app_domain').single();
      if (data) {
        setAppName(data.app_name || 'Our Platform');
        setAppDomain(data.app_domain || window.location.hostname);
      }
    };
    fetchBranding();

    // Auto-search if code in URL
    if (searchParams.get('code')) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    
    setSearching(true);
    setNotFound(false);
    setDeletionStatus(null);

    try {
      const { data, error } = await supabase
        .from('data_deletion_requests')
        .select('confirmation_code, status, requested_at, completed_at')
        .eq('confirmation_code', searchCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setDeletionStatus(data as DeletionStatus);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Data Deletion Request</h1>
        <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        {/* Deletion Status Checker */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Check Deletion Status
            </CardTitle>
            <CardDescription>
              Enter your confirmation code to check the status of your data deletion request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter confirmation code (e.g., DEL-XXXXX-XXXXX)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Check Status'}
              </Button>
            </div>

            {deletionStatus && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {deletionStatus.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-semibold">
                    Status: {' '}
                    <Badge className={deletionStatus.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {deletionStatus.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Confirmation Code: <span className="font-mono">{deletionStatus.confirmation_code}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Requested: {format(new Date(deletionStatus.requested_at), 'MMMM d, yyyy HH:mm')}
                </p>
                {deletionStatus.completed_at && (
                  <p className="text-sm text-muted-foreground">
                    Completed: {format(new Date(deletionStatus.completed_at), 'MMMM d, yyyy HH:mm')}
                  </p>
                )}
              </div>
            )}

            {notFound && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  No deletion request found with that confirmation code. Please check the code and try again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Request Data Deletion
              </CardTitle>
              <CardDescription>
                You have the right to request deletion of your personal data from {appName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                In compliance with data protection regulations (including GDPR and CCPA), you can request 
                the deletion of your personal data at any time.
              </p>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">How to Request Data Deletion:</h3>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                  <li>Log into your {appName} account</li>
                  <li>Navigate to Settings → Account</li>
                  <li>Click on "Delete My Account"</li>
                  <li>Confirm your request</li>
                </ol>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Alternative Method:</h3>
                <p className="text-muted-foreground">
                  If you cannot access your account, send an email to: <br />
                  <strong>support@{appDomain}</strong>
                </p>
                <p className="text-muted-foreground mt-2">
                  Include "Data Deletion Request" in the subject line and provide your registered email address.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Data Will Be Deleted</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Your account information (name, email, phone number)</li>
                <li>Profile settings and preferences</li>
                <li>Connected social media page tokens</li>
                <li>Chatbot flows and automation settings</li>
                <li>Subscriber and customer data</li>
                <li>Message history and conversations</li>
                <li>Store products and orders</li>
                <li>Forms and submissions</li>
                <li>Analytics and usage data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Processing Time</h3>
                <p className="text-muted-foreground">
                  Data deletion requests are processed within 30 days of verification. 
                  You will receive a confirmation email once the deletion is complete.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Data Retention Exceptions</h3>
                <p className="text-muted-foreground">
                  Some data may be retained for legal, regulatory, or legitimate business purposes:
                </p>
                <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                  <li>Transaction records (required for tax/accounting purposes)</li>
                  <li>Data required for legal compliance</li>
                  <li>Anonymized analytics data</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Third-Party Data</h3>
                <p className="text-muted-foreground">
                  Data shared with third-party platforms (Facebook, Instagram, etc.) is subject to their 
                  respective data deletion policies. You may need to request deletion separately from those platforms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Irreversibility</h3>
                <p className="text-muted-foreground text-amber-600 dark:text-amber-400">
                  ⚠️ Data deletion is permanent and cannot be undone. Please ensure you have exported 
                  any data you wish to keep before requesting deletion.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facebook Data Deletion Callback</CardTitle>
              <CardDescription>
                For users who connected via Facebook Login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you connected your account using Facebook Login and wish to delete your data, 
                you can also initiate deletion through Facebook:
              </p>
              <ol className="list-decimal pl-6 mt-2 space-y-1 text-muted-foreground">
                <li>Go to Facebook Settings → Apps and Websites</li>
                <li>Find {appName} in your connected apps</li>
                <li>Click "Remove" and select "Delete all data"</li>
              </ol>
              <p className="text-muted-foreground mt-2">
                This will trigger our data deletion callback and remove your information from our systems.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;
