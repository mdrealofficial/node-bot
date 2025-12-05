import {
  Type,
  Image,
  MousePointer,
  Layout,
  Grid3x3,
  MessageSquare,
  Star,
  Minus,
  Video,
  DollarSign,
  HelpCircle,
  Navigation,
  PanelBottom,
  Timer,
  SeparatorHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const elementTypes = [
  { type: "section", icon: Layout, label: "Section", description: "Container with columns", category: "structure" },
  { type: "hero", icon: Layout, label: "Hero Section", description: "Hero banner with title & CTA", category: "layout" },
  { type: "navbar", icon: Navigation, label: "Navigation Bar", description: "Header navigation menu", category: "layout" },
  { type: "text", icon: Type, label: "Text Block", description: "Rich text content", category: "content" },
  { type: "image", icon: Image, label: "Image", description: "Image with caption", category: "content" },
  { type: "video", icon: Video, label: "Video Embed", description: "YouTube, Vimeo or custom video", category: "content" },
  { type: "button", icon: MousePointer, label: "Button", description: "Call-to-action button", category: "interactive" },
  { type: "features", icon: Grid3x3, label: "Features", description: "Feature grid with cards", category: "sections" },
  { type: "pricing", icon: DollarSign, label: "Pricing Table", description: "Pricing plans comparison", category: "sections" },
  { type: "faq", icon: HelpCircle, label: "FAQ Accordion", description: "Expandable Q&A section", category: "sections" },
  { type: "form", icon: MessageSquare, label: "Form", description: "Contact/lead form", category: "interactive" },
  { type: "countdown", icon: Timer, label: "Countdown Timer", description: "Time-limited offer timer", category: "interactive" },
  { type: "testimonial", icon: Star, label: "Testimonial", description: "Customer testimonial", category: "sections" },
  { type: "footer", icon: PanelBottom, label: "Footer Section", description: "Footer with links & info", category: "layout" },
  { type: "divider", icon: SeparatorHorizontal, label: "Divider", description: "Horizontal divider line", category: "layout" },
  { type: "spacer", icon: Minus, label: "Spacer", description: "Vertical spacing", category: "layout" },
];

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "structure":
      return {
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        hover: "hover:bg-violet-500/20 hover:border-violet-500/50",
        icon: "text-violet-500"
      };
    case "layout":
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        hover: "hover:bg-purple-500/20 hover:border-purple-500/50",
        icon: "text-purple-500"
      };
    case "content":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        hover: "hover:bg-blue-500/20 hover:border-blue-500/50",
        icon: "text-blue-500"
      };
    case "interactive":
      return {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        hover: "hover:bg-green-500/20 hover:border-green-500/50",
        icon: "text-green-500"
      };
    case "sections":
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        hover: "hover:bg-amber-500/20 hover:border-amber-500/50",
        icon: "text-amber-500"
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        hover: "hover:bg-accent",
        icon: "text-primary"
      };
  }
};

export const LandingPageSidebar = () => {
  const onDragStart = (event: React.DragEvent, elementType: string) => {
    event.dataTransfer.setData("application/landingpage", elementType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 py-4 px-2 bg-background/95 backdrop-blur-sm border-r h-full overflow-y-auto relative z-50">
        <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
          Elements
        </div>
        {elementTypes.map((element) => {
          const styles = getCategoryStyles(element.category);
          return (
            <Tooltip key={element.type} delayDuration={200}>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-lg cursor-move border transition-all group ${styles.bg} ${styles.border} ${styles.hover}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, element.type)}
                >
                  <element.icon className={`h-5 w-5 group-hover:scale-110 transition-transform ${styles.icon}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="font-semibold">{element.label}</p>
                <p className="text-xs text-muted-foreground">{element.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
