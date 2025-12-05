import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FeatureAnnouncement {
  id: string;
  title: string;
  message: string;
  sent_at: string;
  feature_id: string | null;
  features: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  user_feature_announcements: { id: string }[];
}

export function useFeatureAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<FeatureAnnouncement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          features (id, name, description),
          user_feature_announcements!left (id)
        `)
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setAnnouncements(data || []);
      const unread = data?.filter((a) => !a.user_feature_announcements?.length).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel("feature_announcements_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
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
          event: "*",
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

  const getUnreadAnnouncementsForFeature = (featureName: string) => {
    return announcements.filter(
      (a) =>
        !a.user_feature_announcements?.length &&
        a.features?.name.toLowerCase().includes(featureName.toLowerCase())
    );
  };

  const hasUnreadAnnouncementForFeature = (featureName: string) => {
    return getUnreadAnnouncementsForFeature(featureName).length > 0;
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

  return {
    announcements,
    unreadCount,
    loading,
    hasUnreadAnnouncementForFeature,
    getUnreadAnnouncementsForFeature,
    markAsRead,
    refresh: loadAnnouncements,
  };
}
