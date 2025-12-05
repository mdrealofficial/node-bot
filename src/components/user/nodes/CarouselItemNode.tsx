import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Image, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodeValidation";
import { ConnectionBadge } from "./ConnectionBadge";

export const CarouselItemNode = memo(({ data }: NodeProps) => {
  const status = getNodeStatus("carouselItem", data);
  const hasImage = !!data.imageUrl;
  const hasTitle = !!data.title;
  
  return (
    <div className={`px-4 py-2 shadow-lg rounded-lg bg-card border-2 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow relative ${
      status.isValid ? 'border-purple-500' : 'border-yellow-500'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Connection Count Badge */}
      <ConnectionBadge 
        current={(data.connectionCount as number) || 0} 
        max={1}
      />
      
      {/* Validation Badge */}
      {!status.isValid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-center justify-center mb-2">
        <Image className="h-5 w-5 text-purple-500" />
      </div>
      
      {status.isValid ? (
        <div className="space-y-1">
          <div className="text-xs font-medium text-foreground truncate">
            {hasTitle ? String(data.title) : "Carousel Item"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {hasImage ? "✓ Image" : "No image"}
          </div>
        </div>
      ) : (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
          {status.message}
        </div>
      )}
      
      {/* Button connection handle with label */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2">
        <span className="text-[10px] text-muted-foreground">Button</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="button"
        className="w-3 h-3"
      />
    </div>
  );
});

CarouselItemNode.displayName = "CarouselItemNode";
