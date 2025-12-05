import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodeValidation";
import { ConnectionBadge } from "./ConnectionBadge";

export const ProductNode = memo(({ data }: NodeProps) => {
  const status = getNodeStatus("product", data);
  const productCount = Array.isArray(data.products) ? data.products.length : 0;
  
  return (
    <div className={`px-4 py-2 shadow-lg rounded-lg bg-card border-2 min-w-[200px] relative ${
      status.isValid ? 'border-emerald-500' : 'border-yellow-500'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Connection Count Badge */}
      <ConnectionBadge 
        current={(data.connectionCount as number) || 0} 
        max={(data.maxConnections as number) || 1} 
      />
      
      {/* Validation Badge */}
      {!status.isValid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-center justify-center mb-2">
        <ShoppingCart className="h-5 w-5 text-emerald-500" />
      </div>
      
      {status.isValid ? (
        <div className="text-xs text-muted-foreground">
          {productCount} product{productCount !== 1 ? 's' : ''} selected
        </div>
      ) : (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
          {status.message}
        </div>
      )}
      
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
});

ProductNode.displayName = "ProductNode";
