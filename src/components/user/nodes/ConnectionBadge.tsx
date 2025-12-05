import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface ConnectionBadgeProps {
  current: number;
  max: number;
}

export const ConnectionBadge = memo(({ current, max }: ConnectionBadgeProps) => {
  const isAtLimit = current >= max && max !== Infinity;
  const isOverLimit = current > max && max !== Infinity;
  
  // Don't show badge for unlimited connections
  if (max === Infinity) {
    return null;
  }
  
  return (
    <Badge 
      variant={isOverLimit ? "destructive" : isAtLimit ? "secondary" : "outline"}
      className="absolute -top-2 -left-2 text-[10px] px-1.5 py-0.5 h-5 shadow-md"
    >
      {current}/{max}
    </Badge>
  );
});

ConnectionBadge.displayName = "ConnectionBadge";
