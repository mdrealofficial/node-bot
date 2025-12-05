import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  message: string;
  sent_at: string;
  features: { name: string; description: string | null } | null;
  user_feature_announcements: { id: string; read_at: string }[];
}

export function FeatureAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadAnnouncements();
      subscribeToAnnouncements();
    }
  }, [user]);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_announcements")
        .select(`
          *,
          features (name, description),
          user_feature_announcements!left (id, read_at)
        `)
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setAnnouncements(data || []);
      const unread = data?.filter((a) => !a.user_feature_announcements?.length).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading announcements:", error);
    }
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel("feature_announcements_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feature_announcements",
        },
        () => {
          loadAnnouncements();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_feature_announcements",
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from("user_feature_announcements")
        .insert({
          user_id: user?.id,
          announcement_id: announcementId,
        });

      if (error && !error.message.includes("duplicate")) {
        throw error;
      }

      loadAnnouncements();
    } catch (error) {
      console.error("Error marking announcement as read:", error);
    }
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
    if (!announcement.user_feature_announcements?.length) {
      markAsRead(announcement.id);
    }
  };

  if (!announcements.length) return null;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => {
          setDialogOpen(true);
          setSelectedAnnouncement(null);
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary"
            variant="default"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {selectedAnnouncement ? selectedAnnouncement.title : "Feature Announcements"}
            </DialogTitle>
            <DialogDescription>
              {selectedAnnouncement
                ? "Learn more about this new feature"
                : "Stay updated with the latest features and improvements"}
            </DialogDescription>
          </DialogHeader>

          {selectedAnnouncement ? (
            <div className="space-y-4">
              {selectedAnnouncement.features && (
                <div>
                  <Badge variant="outline" className="mb-2">
                    {selectedAnnouncement.features.name}
                  </Badge>
                  {selectedAnnouncement.features.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedAnnouncement.features.description}
                    </p>
                  )}
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{selectedAnnouncement.message}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Announced on {new Date(selectedAnnouncement.sent_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {announcements.map((announcement) => {
                  const isUnread = !announcement.user_feature_announcements?.length;
                  return (
                    <Card
                      key={announcement.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isUnread ? "border-primary" : ""
                      }`}
                      onClick={() => handleAnnouncementClick(announcement)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {announcement.title}
                            {isUnread && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                        {announcement.features && (
                          <CardDescription className="text-xs">
                            {announcement.features.name}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {announcement.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(announcement.sent_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
