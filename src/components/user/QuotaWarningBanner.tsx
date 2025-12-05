import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuotaData {
  replies_used: number;
  replies_quota: number;
  quota_reset_at: string;
}

export function QuotaWarningBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      loadQuotaData();
    }
  }, [user]);

  const loadQuotaData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('replies_used, replies_quota, quota_reset_at')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setQuotaData(data);
    }
  };

  if (!quotaData || dismissed) return null;

  const usagePercentage = (quotaData.replies_used / quotaData.replies_quota) * 100;
  
  // Only show warning if usage is above 80%
  if (usagePercentage < 80) return null;

  const isExceeded = usagePercentage >= 100;
  const remaining = quotaData.replies_quota - quotaData.replies_used;
  const resetDate = new Date(quotaData.quota_reset_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Alert 
      variant={isExceeded ? "destructive" : "default"} 
      className="mb-6 relative"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isExceeded ? 'Quota Exceeded' : 'Running Low on Messages'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isExceeded 
            ? `You've used all ${quotaData.replies_quota.toLocaleString()} messages this month. Upgrade to continue sending.`
            : `You have ${remaining.toLocaleString()} messages remaining (${Math.round(100 - usagePercentage)}% left). Resets on ${resetDate}.`
          }
        </span>
        <div className="flex items-center gap-2 ml-4">
          <Button 
            size="sm" 
            onClick={() => navigate('/dashboard?tab=subscription')}
          >
            Upgrade Plan
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
