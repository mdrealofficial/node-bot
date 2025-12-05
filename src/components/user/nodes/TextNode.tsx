import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodeValidation";
import { ConnectionBadge } from "./ConnectionBadge";

export const TextNode = memo(({ data }: NodeProps) => {
  const status = getNodeStatus("text", data);
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-card border-2 min-w-[200px] min-h-[120px] cursor-pointer hover:shadow-xl transition-shadow relative flex flex-col ${
      status.isValid ? 'border-primary' : 'border-yellow-500'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Validation Badge */}
      {!status.isValid && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-center justify-center mb-2">
        <MessageSquare className="h-5 w-5 text-primary" />
      </div>
      
      <div className="flex-1 flex items-center pr-24">
        {status.isValid ? (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {String(data.content || "Click to configure message")}
          </div>
        ) : (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            {status.message}
          </div>
        )}
      </div>
      
      {/* Labels positioned inside, handles at edge */}
      <div className="absolute right-6 top-[30%] -translate-y-1/2">
        <span className="text-[10px] text-muted-foreground">Message</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="message"
        className="w-3 h-3"
        style={{ top: '30%' }}
      />
      
      <div className="absolute right-6 top-[50%] -translate-y-1/2">
        <span className="text-[10px] text-muted-foreground">Buttons</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="buttons"
        className="w-3 h-3"
        style={{ top: '50%' }}
      />
      
      <div className="absolute right-6 top-[70%] -translate-y-1/2">
        <span className="text-[10px] text-muted-foreground">Quick Replies</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="quickReplies"
        className="w-3 h-3"
        style={{ top: '70%' }}
      />
    </div>
  );
});

TextNode.displayName = "TextNode";
