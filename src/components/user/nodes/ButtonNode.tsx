import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { MousePointerClick, CheckCircle, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodeValidation";
import { ConnectionBadge } from "./ConnectionBadge";

export const ButtonNode = memo(({ data }: NodeProps) => {
  const status = getNodeStatus("button", data);
  const actionType = (data.actionType as string) || 'next_message';
  const showSourceHandle = actionType === 'next_message';
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-card border-2 min-w-[200px] min-h-[100px] cursor-pointer hover:shadow-xl transition-shadow relative ${
      status.isValid ? 'border-green-500' : 'border-yellow-500'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Validation Badge */}
      {!status.isValid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-center justify-center mb-2">
        <MousePointerClick className="h-4 w-4 text-green-500" />
      </div>
      
      <div className="text-xs font-medium text-foreground mb-1">
        {String(data.buttonName || "Unnamed Button")}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {actionType === 'url' ? '🔗 Redirect to URL' : 
         actionType === 'start_flow' ? '🔄 Start Flow' : 
         actionType === 'call' ? '📞 Call Button' : '➡️ Next Message'}
      </div>
      
      {!status.isValid && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">
          {status.message}
        </div>
      )}
      
      {showSourceHandle && (
        <Handle type="source" position={Position.Right} className="w-3 h-3" />
      )}
    </div>
  );
});

ButtonNode.displayName = "ButtonNode";
