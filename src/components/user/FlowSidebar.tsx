import {
  MessageSquare,
  Image,
  Music,
  Video,
  File,
  CreditCard,
  LayoutGrid,
  ShoppingCart,
  GitBranch,
  Clock,
  User,
  Bot,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const blockTypes = [
  { type: "text", icon: MessageSquare, label: "Text", description: "Send text message with buttons", category: "interaction" },
  { type: "quickReply", icon: Zap, label: "Quick Reply", description: "Quick reply buttons", category: "interaction" },
  { type: "image", icon: Image, label: "Image", description: "Send image with quick replies", category: "media" },
  { type: "audio", icon: Music, label: "Audio", description: "Send audio file", category: "media" },
  { type: "video", icon: Video, label: "Video", description: "Send video file", category: "media" },
  { type: "file", icon: File, label: "File", description: "Send document file", category: "media" },
  { type: "card", icon: CreditCard, label: "Card", description: "Single card with image & buttons", category: "interaction" },
  { type: "carousel", icon: LayoutGrid, label: "Carousel", description: "Multiple cards in slideshow", category: "interaction" },
  { type: "product", icon: ShoppingCart, label: "Products", description: "Ecommerce product carousel", category: "product" },
  { type: "condition", icon: GitBranch, label: "Condition", description: "If/Else logic branching", category: "logic" },
  { type: "sequence", icon: Clock, label: "Sequence", description: "Follow-up campaigns", category: "logic" },
  { type: "input", icon: User, label: "User Input", description: "Collect user data", category: "interaction" },
  { type: "ai", icon: Bot, label: "AI Reply", description: "Smart AI responses", category: "ai" },
];

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "media":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        hover: "hover:bg-blue-500/20 hover:border-blue-500/50",
        icon: "text-blue-500"
      };
    case "interaction":
      return {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        hover: "hover:bg-green-500/20 hover:border-green-500/50",
        icon: "text-green-500"
      };
    case "logic":
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        hover: "hover:bg-purple-500/20 hover:border-purple-500/50",
        icon: "text-purple-500"
      };
    case "ai":
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        hover: "hover:bg-amber-500/20 hover:border-amber-500/50",
        icon: "text-amber-500"
      };
    case "product":
      return {
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        hover: "hover:bg-cyan-500/20 hover:border-cyan-500/50",
        icon: "text-cyan-500"
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        hover: "hover:bg-accent hover:border-primary/50",
        icon: "text-primary"
      };
  }
};

export const FlowSidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 py-4 px-2 bg-background/95 backdrop-blur-sm border-r h-full">
        {blockTypes.map((block) => {
          const styles = getCategoryStyles(block.category);
          return (
            <Tooltip key={block.type} delayDuration={200}>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-lg cursor-move border transition-all group ${styles.bg} ${styles.border} ${styles.hover}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, block.type)}
                >
                  <block.icon className={`h-5 w-5 group-hover:scale-110 transition-transform ${styles.icon}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="font-semibold">{block.label}</p>
                <p className="text-xs text-muted-foreground">{block.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
