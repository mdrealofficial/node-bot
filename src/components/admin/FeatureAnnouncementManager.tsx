import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Send, Loader2 } from "lucide-react";

interface Feature {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  sent_at: string | null;
  target_roles: string[];
  created_at: string;
  features: { name: string } | null;
}

const availableRoles = [
  { value: "user", label: "Users" },
  { value: "beta_user", label: "Beta Users" },
  { value: "test_user", label: "Test Users" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admins" },
];

export function FeatureAnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    feature_id: "",
    title: "",
    message: "",
    target_roles: ["user"] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [announcementsRes, featuresRes] = await Promise.all([
        supabase
          .from("feature_announcements")
          .select("*, features(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("features")
          .select("id, name")
          .eq("stage", "stable")
          .order("name"),
      ]);

      if (announcementsRes.error) throw announcementsRes.error;
      if (featuresRes.error) throw featuresRes.error;

      setAnnouncements(announcementsRes.data || []);
      setFeatures(featuresRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.from("feature_announcements").insert({
        feature_id: formData.feature_id || null,
        title: formData.title,
        message: formData.message,
        target_roles: formData.target_roles,
        created_by: session.user.id,
      });

      if (error) throw error;

      toast({ title: "Announcement created successfully" });
      setDialogOpen(false);
      loadData();
      setFormData({
        feature_id: "",
        title: "",
        message: "",
        target_roles: ["user"],
      });
    } catch (error: any) {
      toast({
        title: "Error creating announcement",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSend = async (announcementId: string) => {
    try {
      setSending(announcementId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("send-feature-announcement", {
        body: { announcementId },
      });

      if (error) throw error;

      toast({ 
        title: "Announcement sent!", 
        description: "Email notifications have been sent to all target users" 
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error sending announcement",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feature Announcements</CardTitle>
            <CardDescription>Notify users about new features</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Target Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell>{announcement.features?.name || "—"}</TableCell>
                <TableCell className="font-medium">{announcement.title}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {announcement.target_roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {availableRoles.find((r) => r.value === role)?.label || role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {announcement.sent_at ? (
                    <Badge className="bg-green-500">Sent</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(announcement.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {!announcement.sent_at && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(announcement.id)}
                      disabled={sending === announcement.id}
                    >
                      {sending === announcement.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Feature Announcement</DialogTitle>
            <DialogDescription>
              Create an announcement to notify users about new features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="feature">Feature (Optional)</Label>
              <Select
                value={formData.feature_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, feature_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific feature</SelectItem>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Announcement Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter announcement message"
                rows={5}
              />
            </div>

            <div>
              <Label>Target Roles</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {availableRoles.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.value}
                      checked={formData.target_roles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
