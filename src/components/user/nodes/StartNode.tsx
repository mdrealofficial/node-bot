import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Play, AlertCircle } from "lucide-react";

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as {
    label?: string;
    flowName?: string;
    triggerKeyword?: string;
    matchType?: 'exact' | 'partial';
  };

  const hasConfig = nodeData.flowName && String(nodeData.flowName).trim().length > 0;

  return (
    <>
      <Card
        className={`p-4 min-w-[200px] cursor-pointer transition-all relative ${
          selected ? "ring-2 ring-primary shadow-lg" : "shadow-md hover:shadow-lg"
        } ${!hasConfig ? 'border-2 border-red-500' : ''}`}
      >
        {/* Validation Badge */}
        {!hasConfig && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div className="font-semibold text-sm">Start Flow</div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          {nodeData.flowName && (
            <div>
              <span className="font-medium">Flow:</span> {nodeData.flowName}
            </div>
          )}
          {nodeData.triggerKeyword && (
            <div>
              <span className="font-medium">Keyword:</span> {nodeData.triggerKeyword}
            </div>
          )}
          {nodeData.matchType && (
            <div>
              <span className="font-medium">Match:</span> {nodeData.matchType}
            </div>
          )}
        </div>
        
        {!hasConfig && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
            ⚠ Flow name required
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  );
});

StartNode.displayName = "StartNode";
