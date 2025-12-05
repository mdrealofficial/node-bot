import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertCircle, Plus, Edit } from 'lucide-react';

interface InstagramAccount {
  id: string;
  instagram_username: string;
  account_name: string;
}

interface UnsentMessage {
  id: string;
  sender_instagram_id: string;
  sender_name: string;
  message_text: string;
  unsent_at: string;
  created_at: string;
}

interface ReplyTemplate {
  id: string;
  name: string;
  reply_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function InstagramUnsentMessages() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [unsentMessages, setUnsentMessages] = useState<UnsentMessage[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    reply_message: '',
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchUnsentMessages();
      fetchTemplates();
    }
  }, [selectedAccountId]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('id, instagram_username, account_name')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('connected_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setAccounts(data);
        setSelectedAccountId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load Instagram accounts');
    }
  };

  const fetchUnsentMessages = async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_unsent_messages')
        .select('*')
        .eq('instagram_account_id', selectedAccountId)
        .order('unsent_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setUnsentMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching unsent messages:', error);
      toast.error('Failed to load unsent messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!selectedAccountId) return;

    try {
      const { data, error } = await supabase
        .from('instagram_unsent_reply_templates')
        .select('*')
        .eq('instagram_account_id', selectedAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no templates exist, create default
      if (!data || data.length === 0) {
        await createDefaultTemplate();
        return;
      }

      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const createDefaultTemplate = async () => {
    if (!selectedAccountId || !user) return;

    try {
      const { error } = await supabase.from('instagram_unsent_reply_templates').insert({
        instagram_account_id: selectedAccountId,
        user_id: user.id,
        name: 'Unsent Message Auto-Reply',
        reply_message: 'Hi! 👋 I noticed you unsent a message. No worries! If you need anything or have questions, feel free to reach out anytime. I\'m here to help! 😊',
        is_active: false
      });

      if (error) throw error;

      // Re-fetch after creation
      await fetchTemplates();
    } catch (error: any) {
      console.error('Error creating default template:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reply_message || !editingTemplate) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      const { error } = await supabase
        .from('instagram_unsent_reply_templates')
        .update({
          reply_message: formData.reply_message,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;
      toast.success('Reply message updated successfully');

      setEditingTemplate(null);
      setFormData({ name: '', reply_message: '', is_active: true });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleToggleActive = async (template: ReplyTemplate) => {
    try {
      const { error } = await supabase
        .from('instagram_unsent_reply_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast.success(template.is_active ? 'Template deactivated' : 'Template activated');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error toggling template:', error);
      toast.error('Failed to toggle template');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Instagram Unsent Messages</CardTitle>
          <CardDescription>
            View messages that were sent and then unsent by users. Set up auto-reply templates to respond when users unsend messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No Instagram accounts connected</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Instagram Account:</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select an Instagram account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.instagram_username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading unsent messages...
                </div>
              ) : unsentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No unsent messages found</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Unsent At</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unsentMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="font-medium">
                            {message.sender_name}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="truncate">{message.message_text}</p>
                          </TableCell>
                          <TableCell>
                            {format(new Date(message.unsent_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Unsent</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Auto-Reply Templates Section */}
              <div className="mt-8 pt-6 border-t">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Auto-Reply Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Edit the automatic reply sent when users unsend messages
                  </p>
                </div>

                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <p>Loading template...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Card key={template.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{template.name}</h4>
                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                  {template.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {template.reply_message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last updated {format(new Date(template.updated_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setFormData({
                                        name: template.name,
                                        reply_message: template.reply_message,
                                        is_active: template.is_active,
                                      });
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Unsent Message Auto-Reply</DialogTitle>
                                    <DialogDescription>
                                      Customize the reply sent when users unsend their messages
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-message">Auto-Reply Message *</Label>
                                      <Textarea
                                        id="edit-message"
                                        value={formData.reply_message}
                                        onChange={(e) => setFormData({ ...formData, reply_message: e.target.value })}
                                        placeholder="Enter the message to send when someone unsends..."
                                        rows={6}
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        This message will be sent automatically when someone unsends a message
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => {}}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleSubmit}>
                                      Save Changes
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Switch
                                checked={template.is_active}
                                onCheckedChange={() => handleToggleActive(template)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
