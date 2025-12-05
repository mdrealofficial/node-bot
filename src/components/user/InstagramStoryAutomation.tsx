import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Film, Edit, AlertCircle, Sparkles, AtSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InstagramAccount {
  id: string;
  instagram_username: string;
  account_name: string;
}

interface StoryTrigger {
  id: string;
  trigger_type: string;
  dm_message: string;
  is_active: boolean;
  instagram_account_id: string;
}

export const InstagramStoryAutomation = () => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [mentionTemplate, setMentionTemplate] = useState<StoryTrigger | null>(null);
  const [replyTemplate, setReplyTemplate] = useState<StoryTrigger | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<StoryTrigger | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [dmMessage, setDmMessage] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTriggers();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("instagram_accounts")
      .select("id, instagram_username, account_name")
      .eq("user_id", session.session.user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch Instagram accounts",
      });
      return;
    }

    setAccounts(data || []);
    if (data && data.length > 0) {
      setSelectedAccount(data[0].id);
    }
  };

  const fetchTriggers = async () => {
    if (!selectedAccount) return;

    const { data, error } = await supabase
      .from("instagram_story_triggers")
      .select("*")
      .eq("instagram_account_id", selectedAccount);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch story templates",
      });
      return;
    }

    // If no templates exist, create defaults
    if (!data || data.length === 0) {
      await createDefaultTemplates();
      return;
    }

    const mention = data?.find(t => t.trigger_type === 'story_mentions');
    const reply = data?.find(t => t.trigger_type === 'all_story_replies');
    
    setMentionTemplate(mention || null);
    setReplyTemplate(reply || null);
  };

  const createDefaultTemplates = async () => {
    if (!selectedAccount) return;

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    try {
      const { error } = await supabase.from('instagram_story_triggers').insert([
        {
          instagram_account_id: selectedAccount,
          user_id: session.session.user.id,
          name: 'Story Reply Auto-Response',
          dm_message: 'Thanks for replying to my story! 🎉 I love hearing from you. What did you think about it? Let me know if you have any questions or just want to chat! 💬',
          trigger_type: 'all_story_replies',
          is_active: true
        },
        {
          instagram_account_id: selectedAccount,
          user_id: session.session.user.id,
          name: 'Story Mention Auto-Response',
          dm_message: 'Hey! 🙏 Thanks so much for mentioning me in your story! That really means a lot. I appreciate the shoutout! Let\'s stay connected. 💫',
          trigger_type: 'story_mentions',
          is_active: true
        }
      ]);

      if (error) throw error;

      // Re-fetch after creation
      await fetchTriggers();
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  };

  const handleEdit = (template: StoryTrigger) => {
    setEditingTemplate(template);
    setDmMessage(template.dm_message);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!dmMessage || !editingTemplate) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a DM message",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("instagram_story_triggers")
      .update({ dm_message: dmMessage })
      .eq("id", editingTemplate.id);

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update template",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Template updated successfully",
    });

    setIsDialogOpen(false);
    setEditingTemplate(null);
    setDmMessage("");
    fetchTriggers();
  };

  const handleToggleActive = async (template: StoryTrigger) => {
    const { error } = await supabase
      .from("instagram_story_triggers")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to toggle template status",
      });
      return;
    }

    fetchTriggers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Instagram Story Automation</h2>
        <p className="text-muted-foreground mt-2">
          Edit the automatic DM sent when users reply to your stories or mention you
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Story Reply DM Limitations</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <p className="text-sm">
              <strong>Important:</strong> Instagram only allows DMs to users who have already messaged your account. 
              Story replies count as messages, so DMs will work after someone replies to your story.
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>✓ Story replies trigger immediate DM delivery</li>
              <li>✓ Story mentions work if the user has messaged you before</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {accounts.length > 0 && (
        <div className="space-y-2">
          <Label>Instagram Account</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[300px]">
              <SelectValue />
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
      )}

      {accounts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No Instagram accounts connected</p>
              <p className="text-sm mt-2">Connect an Instagram account to manage story automation</p>
            </div>
          </CardContent>
        </Card>
      )}

      {accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Story Mention Template */}
          {mentionTemplate && (
            <Card className={!mentionTemplate.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Story Mention Template</CardTitle>
                    <CardDescription className="text-sm">
                      Auto-reply when users mention you in their story
                    </CardDescription>
                  </div>
                  <Switch
                    checked={mentionTemplate.is_active}
                    onCheckedChange={() => handleToggleActive(mentionTemplate)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium mb-1">DM Message:</div>
                  <div className="bg-muted p-3 rounded-md">
                    {mentionTemplate.dm_message}
                  </div>
                </div>

                <Dialog open={isDialogOpen && editingTemplate?.id === mentionTemplate.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEdit(mentionTemplate)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Story Mention Auto-Response</DialogTitle>
                      <DialogDescription>
                        Customize the message sent when users mention you in their story
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dm-message">Auto-Reply Message *</Label>
                        <Textarea
                          id="dm-message"
                          value={dmMessage}
                          onChange={(e) => setDmMessage(e.target.value)}
                          placeholder="Thanks for mentioning me! 🙏"
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent automatically when someone mentions you
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Story Private Reply Template */}
          {replyTemplate && (
            <Card className={!replyTemplate.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Story Private Reply Template</CardTitle>
                    <CardDescription className="text-sm">
                      Auto-reply when users privately reply to your story
                    </CardDescription>
                  </div>
                  <Switch
                    checked={replyTemplate.is_active}
                    onCheckedChange={() => handleToggleActive(replyTemplate)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium mb-1">DM Message:</div>
                  <div className="bg-muted p-3 rounded-md">
                    {replyTemplate.dm_message}
                  </div>
                </div>

                <Dialog open={isDialogOpen && editingTemplate?.id === replyTemplate.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEdit(replyTemplate)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Story Reply Auto-Response</DialogTitle>
                      <DialogDescription>
                        Customize the message sent when users reply to your story
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dm-message">Auto-Reply Message *</Label>
                        <Textarea
                          id="dm-message"
                          value={dmMessage}
                          onChange={(e) => setDmMessage(e.target.value)}
                          placeholder="Thanks for replying to my story! 🎉"
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent automatically when someone replies to your story
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};