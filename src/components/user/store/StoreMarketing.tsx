import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SMSCampaignForm } from './SMSCampaignForm';
import { formatDistanceToNow } from 'date-fns';

interface StoreMarketingProps {
  storeId: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export function StoreMarketing({ storeId }: StoreMarketingProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, [storeId]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('store_sms_campaigns')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'sending':
        return <Send className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'sending':
        return 'text-blue-600';
      case 'scheduled':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📣 Marketing</h2>
          <p className="text-muted-foreground">Send SMS campaigns to your customers</p>
        </div>
        <Button onClick={() => setShowCampaignForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">SMS Campaigns</TabsTrigger>
          <TabsTrigger value="history">Campaign History</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {showCampaignForm ? (
            <SMSCampaignForm
              storeId={storeId}
              onCancel={() => setShowCampaignForm(false)}
              onSuccess={() => {
                setShowCampaignForm(false);
                loadCampaigns();
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No active campaigns. Create one to get started!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">Loading campaigns...</div>
              </CardContent>
            </Card>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No campaign history yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(campaign.status)}
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <span className={`text-xs uppercase font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {campaign.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Recipients: {campaign.total_recipients}</span>
                          {campaign.sent_count > 0 && (
                            <>
                              <span>Sent: {campaign.sent_count}</span>
                              {campaign.failed_count > 0 && (
                                <span>Failed: {campaign.failed_count}</span>
                              )}
                            </>
                          )}
                          <span>
                            {campaign.sent_at
                              ? `Sent ${formatDistanceToNow(new Date(campaign.sent_at), { addSuffix: true })}`
                              : campaign.scheduled_at
                              ? `Scheduled for ${formatDistanceToNow(new Date(campaign.scheduled_at), { addSuffix: true })}`
                              : `Created ${formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}