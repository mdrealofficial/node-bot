import { memo, useMemo } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { LayoutGrid, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodeValidation";
import { ConnectionBadge } from "./ConnectionBadge";

export const CarouselNode = memo(({ data, id }: NodeProps) => {
  const status = getNodeStatus("carousel", data);
  const { getEdges } = useReactFlow();
  
  // Count connected carousel items
  const cardCount = useMemo(() => {
    const edges = getEdges();
    return edges.filter(
      edge => edge.source === id && edge.sourceHandle === 'items' && edge.target
    ).length;
  }, [getEdges, id]);
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-card border-2 min-w-[300px] min-h-[140px] cursor-pointer hover:shadow-xl transition-shadow relative ${
      status.isValid ? 'border-teal-500' : 'border-yellow-500'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3"
        style={{ left: '8px' }}
      />
      
      {/* Validation Badge */}
      {!status.isValid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-center justify-center mb-2">
        <LayoutGrid className="h-5 w-5 text-teal-500" />
      </div>
      
      <div className="text-xs font-semibold text-center mb-2">Carousel</div>
      
      {status.isValid ? (
        <div className="text-xs text-muted-foreground text-center">
          {cardCount} card{cardCount !== 1 ? 's' : ''}
        </div>
      ) : (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium text-center">
          {status.message}
        </div>
      )}
      
      {/* Three connection handles on right edge with labels inside */}
      <div className="absolute right-0 top-[30%] -translate-y-1/2 flex items-center gap-2 pr-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Next</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="next"
          style={{ position: 'relative', right: '-4px', top: 'auto', transform: 'none' }}
          className="w-3 h-3"
        />
      </div>
      
      <div className="absolute right-0 top-[50%] -translate-y-1/2 flex items-center gap-2 pr-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Items</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="items"
          style={{ position: 'relative', right: '-4px', top: 'auto', transform: 'none' }}
          className="w-3 h-3"
        />
      </div>
      
      <div className="absolute right-0 top-[70%] -translate-y-1/2 flex items-center gap-2 pr-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Quick Replies</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="quickReplies"
          style={{ position: 'relative', right: '-4px', top: 'auto', transform: 'none' }}
          className="w-3 h-3"
        />
      </div>
    </div>
  );
});

CarouselNode.displayName = "CarouselNode";
