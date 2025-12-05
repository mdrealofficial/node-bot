import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Broadcast {
  id: string;
  name: string;
  message_text: string | null;
  message_type: string;
  target_type: string;
  target_tags: string[] | null;
  scheduled_at: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface WhatsAppAccount {
  id: string;
  phone_number: string;
  display_phone_number: string;
}

export const WhatsAppBroadcast = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [selectedAccount, setSelectedAccount] = useState("");
  const [broadcastName, setBroadcastName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [targetType, setTargetType] = useState<"all" | "tags">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    fetchAccounts();
    fetchBroadcasts();
    fetchAvailableTags();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load WhatsApp accounts");
    }
  };

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_broadcasts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error: any) {
      console.error("Error fetching broadcasts:", error);
      toast.error("Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_subscribers")
        .select("tags")
        .eq("user_id", user.id);

      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach(sub => {
        sub.tags?.forEach(tag => tags.add(tag));
      });
      
      setAvailableTags(Array.from(tags));
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const createBroadcast = async () => {
    if (!broadcastName.trim() || !messageText.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (targetType === "tags" && selectedTags.length === 0) {
      toast.error("Please select at least one tag");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get subscriber count
      let subscriberQuery = supabase
        .from("whatsapp_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("whatsapp_account_id", selectedAccount);

      if (targetType === "tags") {
        subscriberQuery = subscriberQuery.overlaps("tags", selectedTags);
      }

      const { count } = await subscriberQuery;

      const { data, error } = await supabase
        .from("whatsapp_broadcasts")
        .insert({
          user_id: user.id,
          whatsapp_account_id: selectedAccount,
          name: broadcastName,
          message_text: messageText,
          message_type: "text",
          target_type: targetType,
          target_tags: targetType === "tags" ? selectedTags : null,
          status: "draft",
          total_recipients: count || 0
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Broadcast created! Ready to send.");
      setShowNewDialog(false);
      resetForm();
      fetchBroadcasts();
    } catch (error: any) {
      console.error("Error creating broadcast:", error);
      toast.error("Failed to create broadcast");
    }
  };

  const sendBroadcast = async (broadcastId: string) => {
    if (!confirm("Are you sure you want to send this broadcast? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_broadcasts")
        .update({ status: "scheduled", scheduled_at: new Date().toISOString() })
        .eq("id", broadcastId);

      if (error) throw error;

      toast.success("Broadcast scheduled for sending!");
      fetchBroadcasts();
    } catch (error: any) {
      console.error("Error scheduling broadcast:", error);
      toast.error("Failed to schedule broadcast");
    }
  };

  const resetForm = () => {
    setBroadcastName("");
    setMessageText("");
    setTargetType("all");
    setSelectedTags([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "sending":
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Broadcasts</h2>
          <p className="text-muted-foreground">Send bulk messages to your subscribers</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account">WhatsApp Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.display_phone_number || acc.phone_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Broadcast Name</Label>
                <Input
                  id="name"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  placeholder="e.g., Summer Sale Announcement"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your broadcast message..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {messageText.length} characters
                </p>
              </div>

              <div>
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={(value: "all" | "tags") => setTargetType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="tags">Subscribers with Tags</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "tags" && (
                <div>
                  <Label>Select Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={createBroadcast} className="w-full">
                Create Broadcast
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : broadcasts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No broadcasts yet</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Broadcast
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {broadcast.name}
                      {getStatusIcon(broadcast.status)}
                      <Badge variant="outline" className="capitalize">
                        {broadcast.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  {broadcast.status === "draft" && (
                    <Button onClick={() => sendBroadcast(broadcast.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Send Now
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message</p>
                    <p className="text-sm">{broadcast.message_text}</p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Recipients</p>
                      <p className="text-lg font-bold">{broadcast.total_recipients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sent</p>
                      <p className="text-lg font-bold text-green-600">{broadcast.sent_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-lg font-bold text-red-600">{broadcast.failed_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-sm font-medium capitalize">{broadcast.target_type}</p>
                    </div>
                  </div>

                  {broadcast.target_tags && broadcast.target_tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Target Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {broadcast.target_tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};