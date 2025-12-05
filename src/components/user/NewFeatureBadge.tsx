import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useFeatureAnnouncements } from "@/hooks/useFeatureAnnouncements";

interface NewFeatureBadgeProps {
  featureName: string;
  variant?: "dot" | "badge" | "icon";
  className?: string;
}

export function NewFeatureBadge({ 
  featureName, 
  variant = "badge",
  className = "" 
}: NewFeatureBadgeProps) {
  const { hasUnreadAnnouncementForFeature } = useFeatureAnnouncements();
  
  const hasNew = hasUnreadAnnouncementForFeature(featureName);

  if (!hasNew) return null;

  if (variant === "dot") {
    return (
      <span className={`absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse ${className}`} />
    );
  }

  if (variant === "icon") {
    return (
      <Sparkles className={`h-3 w-3 text-primary animate-pulse ${className}`} />
    );
  }

  return (
    <Badge 
      variant="default" 
      className={`ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary animate-pulse ${className}`}
    >
      New
    </Badge>
  );
}
