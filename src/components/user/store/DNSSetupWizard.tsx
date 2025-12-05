import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DNSSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  appDomain: string;
}

export function DNSSetupWizard({ open, onOpenChange, domain, appDomain }: DNSSetupWizardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isSubdomain = domain.split('.').length > 2;
  const domainParts = domain.split('.');
  const subdomain = isSubdomain ? domainParts[0] : '@';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">DNS Setup Wizard</DialogTitle>
          <DialogDescription>
            Follow these step-by-step instructions to configure your domain: <strong>{domain}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="cloudflare" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
            <TabsTrigger value="godaddy">GoDaddy</TabsTrigger>
            <TabsTrigger value="namecheap">Namecheap</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          {/* Cloudflare Instructions */}
          <TabsContent value="cloudflare" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 1</Badge>
                  <h3 className="font-semibold">Log into Cloudflare Dashboard</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    dash.cloudflare.com <ExternalLink className="h-3 w-3" />
                  </a> and select your domain.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 2</Badge>
                  <h3 className="font-semibold">Navigate to DNS Settings</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click on <strong>DNS</strong> in the left sidebar, then click <strong>Records</strong>.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 3</Badge>
                  <h3 className="font-semibold">Add DNS Record</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Click <strong>Add record</strong> button and enter the following details:
                </p>
                
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1">CNAME</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard('CNAME', 'Type')}
                        >
                          {copiedField === 'Type' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Name</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1">{subdomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(subdomain, 'Name')}
                        >
                          {copiedField === 'Name' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Target/Content</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1 text-xs">{appDomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(appDomain, 'Target')}
                        >
                          {copiedField === 'Target' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Proxy Status</label>
                      <code className="bg-background px-3 py-2 rounded border block mt-1">DNS only (gray cloud)</code>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">TTL</label>
                      <code className="bg-background px-3 py-2 rounded border block mt-1">Auto</code>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm">
                  <p className="text-blue-900 dark:text-blue-100">
                    <strong>Important:</strong> Make sure the proxy is turned OFF (gray cloud icon) for this record to work properly.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 4</Badge>
                  <h3 className="font-semibold">Save and Verify</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click <strong>Save</strong>, wait a few minutes for propagation, then return to the store settings and click the verify button.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GoDaddy Instructions */}
          <TabsContent value="godaddy" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 1</Badge>
                  <h3 className="font-semibold">Access Domain Settings</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Log into <a href="https://account.godaddy.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    GoDaddy Account <ExternalLink className="h-3 w-3" />
                  </a> and go to <strong>My Products</strong>.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 2</Badge>
                  <h3 className="font-semibold">Manage DNS</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Next to your domain, click <strong>DNS</strong> button to open DNS Management.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 3</Badge>
                  <h3 className="font-semibold">Add New Record</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Click <strong>Add</strong> button and select <strong>CNAME</strong> record type:
                </p>
                
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Host/Name</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1">{subdomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(subdomain, 'Host')}
                        >
                          {copiedField === 'Host' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Points to / Value</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1 text-xs">{appDomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(appDomain, 'Value')}
                        >
                          {copiedField === 'Value' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">TTL</label>
                      <code className="bg-background px-3 py-2 rounded border block mt-1">1 Hour (or Default)</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 4</Badge>
                  <h3 className="font-semibold">Save Changes</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click <strong>Save</strong> and wait 10-30 minutes for DNS propagation before verifying.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Namecheap Instructions */}
          <TabsContent value="namecheap" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 1</Badge>
                  <h3 className="font-semibold">Go to Domain List</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign in to <a href="https://www.namecheap.com/myaccount/login/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Namecheap <ExternalLink className="h-3 w-3" />
                  </a> and select <strong>Domain List</strong> from the left sidebar.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 2</Badge>
                  <h3 className="font-semibold">Access Advanced DNS</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click <strong>Manage</strong> next to your domain, then click on the <strong>Advanced DNS</strong> tab.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 3</Badge>
                  <h3 className="font-semibold">Add New Record</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Click <strong>Add New Record</strong> button and configure:
                </p>
                
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1">CNAME Record</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard('CNAME', 'Type')}
                        >
                          {copiedField === 'Type' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Host</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1">{subdomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(subdomain, 'Host')}
                        >
                          {copiedField === 'Host' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Value</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-background px-3 py-2 rounded border flex-1 text-xs">{appDomain}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(appDomain, 'Value')}
                        >
                          {copiedField === 'Value' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">TTL</label>
                      <code className="bg-background px-3 py-2 rounded border block mt-1">Automatic</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Step 4</Badge>
                  <h3 className="font-semibold">Save All Changes</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the <strong>Save All Changes</strong> button and wait for DNS propagation (usually 30 minutes).
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Providers */}
          <TabsContent value="other" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg mb-4">Generic DNS Configuration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Most DNS providers follow a similar process. Here are the values you need to configure:
                </p>
                
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Record Type</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-background px-3 py-2 rounded border flex-1">CNAME</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard('CNAME', 'Record Type')}
                      >
                        {copiedField === 'Record Type' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Name/Host</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-background px-3 py-2 rounded border flex-1">{subdomain}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(subdomain, 'Name/Host')}
                      >
                        {copiedField === 'Name/Host' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use @ for root domain or your subdomain name (e.g., "shop" for shop.example.com)
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Value/Points To/Target</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-background px-3 py-2 rounded border flex-1 text-xs">{appDomain}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(appDomain, 'Value')}
                      >
                        {copiedField === 'Value' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the app domain shown above
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">TTL (Time To Live)</label>
                    <code className="bg-background px-3 py-2 rounded border block mt-1">3600 (1 hour) or Auto</code>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Common Provider Links:</h4>
                  <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                    <li>• <strong>Google Domains:</strong> DNS → Custom Records → Manage Custom Records</li>
                    <li>• <strong>Amazon Route 53:</strong> Hosted Zones → Select Domain → Create Record</li>
                    <li>• <strong>DigitalOcean:</strong> Networking → Domains → Add Record</li>
                    <li>• <strong>Hover:</strong> DNS → Add New</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
