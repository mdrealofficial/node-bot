import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function WhatsAppQRConnection() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'generating' | 'waiting' | 'connected' | 'failed'>('idle');
  const [wahaConfigured, setWahaConfigured] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkWAHAConfig();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connectionStatus === 'waiting' && sessionId) {
      interval = setInterval(() => {
        checkConnectionStatus();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, sessionId]);

  const checkWAHAConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_config')
        .select('waha_url, waha_api_key')
        .single();

      if (error) {
        console.error('Error checking WAHA config:', error);
        setWahaConfigured(false);
        setErrorMessage('Unable to check WAHA configuration');
        return;
      }
      
      const isConfigured = !!(data?.waha_url && data?.waha_api_key);
      setWahaConfigured(isConfigured);
      
      if (!isConfigured) {
        setErrorMessage('WAHA server URL and API key must be configured by administrator');
      }
    } catch (error) {
      console.error('Error checking WAHA config:', error);
      setWahaConfigured(false);
      setErrorMessage('Failed to check WAHA configuration');
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-waha-connect', {
        body: { action: 'check_status', sessionId }
      });

      if (error) {
        console.error('Error checking connection status:', error);
        return;
      }

      if (data?.status === 'WORKING') {
        setConnectionStatus('connected');
        toast.success('WhatsApp connected successfully!', { duration: 3000 });
      } else if (data?.status === 'FAILED' || data?.status === 'STOPPED') {
        setConnectionStatus('failed');
        setErrorMessage('Connection failed. Please try again.');
        toast.error('Connection failed. Please try again.', { duration: 3000 });
      }
    } catch (error: any) {
      console.error('Error checking connection status:', error);
    }
  };

  const generateQRCode = async () => {
    setGenerating(true);
    setConnectionStatus('generating');
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-waha-connect', {
        body: { action: 'generate_qr' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate QR code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.qr) {
        // Handle QR code - it might be base64 or a URL
        let qrImage = data.qr;
        if (!qrImage.startsWith('data:') && !qrImage.startsWith('http')) {
          qrImage = `data:image/png;base64,${qrImage}`;
        }
        setQrCode(qrImage);
        setSessionId(data.sessionId);
        setConnectionStatus('waiting');
        toast.success('QR code generated! Scan with WhatsApp to connect.', { duration: 3000 });
      } else {
        throw new Error('No QR code received from server');
      }
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setErrorMessage(error.message || 'Failed to generate QR code');
      toast.error(error.message || 'Failed to generate QR code', { duration: 3000 });
      setConnectionStatus('failed');
    } finally {
      setGenerating(false);
    }
  };

  const resetConnection = () => {
    setQrCode(null);
    setSessionId(null);
    setConnectionStatus('idle');
    setErrorMessage(null);
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Checking WAHA configuration...</p>
        </CardContent>
      </Card>
    );
  }

  // WAHA not configured state
  if (wahaConfigured === false) {
    return (
      <Card className="border-amber-500/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">WAHA Server Not Configured</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {errorMessage || 'The WAHA (WhatsApp HTTP API) server has not been configured by the administrator. Please contact your system administrator to set up WAHA integration.'}
          </p>
          <div className="bg-muted/50 rounded-lg p-4 max-w-md">
            <p className="text-sm text-muted-foreground">
              <strong>For Administrators:</strong> Go to Admin Panel → WAHA Settings to configure the WAHA server URL and API key.
            </p>
          </div>
          <Button variant="outline" onClick={checkWAHAConfig} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect WhatsApp via QR Code</CardTitle>
          <CardDescription>
            Scan the QR code with your WhatsApp mobile app to connect your personal WhatsApp account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectionStatus === 'idle' && (
            <div className="flex flex-col items-center py-8">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
              <p className="text-center text-muted-foreground mb-6 max-w-md">
                Generate a QR code to connect your personal WhatsApp account. This uses the WAHA server configured by your administrator.
              </p>
              <Button onClick={generateQRCode} disabled={generating} size="lg">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          )}

          {(connectionStatus === 'generating' || connectionStatus === 'waiting') && qrCode && (
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
              </div>
              
              {connectionStatus === 'waiting' && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for you to scan the QR code...
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4 max-w-md">
                <h4 className="font-semibold mb-2">How to scan:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Tap <strong>Menu (⋮)</strong> or <strong>Settings (⚙️)</strong></li>
                  <li>3. Tap <strong>"Linked Devices"</strong></li>
                  <li>4. Tap <strong>"Link a Device"</strong></li>
                  <li>5. Point your phone camera at this QR code</li>
                </ol>
              </div>

              <Button variant="outline" onClick={resetConnection}>
                Cancel
              </Button>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="flex flex-col items-center py-8">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Successfully Connected!</h3>
              <p className="text-center text-muted-foreground mb-6">
                Your WhatsApp account is now connected and ready to use
              </p>
              <Button variant="outline" onClick={resetConnection}>
                Connect Another Account
              </Button>
            </div>
          )}

          {connectionStatus === 'failed' && (
            <div className="flex flex-col items-center py-8">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
              <p className="text-center text-muted-foreground mb-2">
                {errorMessage || 'Unable to connect your WhatsApp account. Please try again.'}
              </p>
              <Button onClick={resetConnection} className="mt-4">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
