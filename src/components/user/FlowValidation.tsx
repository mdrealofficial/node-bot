import { Node, Edge } from "@xyflow/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getNodeStatus } from "./nodes/nodeValidation";

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  nodeId?: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check if there's a start node
  const startNode = nodes.find(n => n.type === "start");
  if (!startNode) {
    issues.push({
      severity: "error",
      message: "Flow must have a Start node"
    });
    return { isValid: false, issues };
  }

  // Check if start node has a flow name
  const flowName = startNode.data.flowName;
  if (!flowName || !String(flowName).trim()) {
    issues.push({
      severity: "error",
      nodeId: startNode.id,
      message: "Start node must have a flow name. Double-click the Start node to configure it."
    });
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  connectedNodeIds.add(startNode.id);

  // Build graph from start node
  const queue = [startNode.id];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const outgoingEdges = edges.filter(e => e.source === currentId);
    
    outgoingEdges.forEach(edge => {
      if (!connectedNodeIds.has(edge.target)) {
        connectedNodeIds.add(edge.target);
        queue.push(edge.target);
      }
    });
  }

  // Find disconnected nodes
  const disconnectedNodes = nodes.filter(n => 
    n.type !== "start" && !connectedNodeIds.has(n.id)
  );

  disconnectedNodes.forEach(node => {
    issues.push({
      severity: "warning",
      nodeId: node.id,
      message: `Node "${node.data.label || node.type}" is not connected to the flow`
    });
  });

  // Check for nodes with missing configurations
  nodes.forEach(node => {
    const status = getNodeStatus(node.type || "text", node.data);
    if (!status.isValid) {
      issues.push({
        severity: "error",
        nodeId: node.id,
        message: `${node.data.label || node.type}: ${status.message}`
      });
    }
  });

  // Check for nodes without outgoing connections (dead ends)
  const nodesWithoutOutput = nodes.filter(n => {
    if (n.type === "start") return false;
    const hasOutgoing = edges.some(e => e.source === n.id);
    return !hasOutgoing && connectedNodeIds.has(n.id);
  });

  nodesWithoutOutput.forEach(node => {
    issues.push({
      severity: "info",
      nodeId: node.id,
      message: `Node "${node.data.label || node.type}" has no outgoing connections (flow ends here)`
    });
  });

  // Check if start node has no outgoing connections
  const startHasOutput = edges.some(e => e.source === startNode.id);
  if (!startHasOutput && nodes.length > 1) {
    issues.push({
      severity: "error",
      nodeId: startNode.id,
      message: "Start node must be connected to at least one node"
    });
  }

  const hasErrors = issues.some(i => i.severity === "error");
  return { isValid: !hasErrors, issues };
}

interface FlowValidationDialogProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  validationResult: ValidationResult;
}

export function FlowValidationDialog({
  open,
  onClose,
  onProceed,
  validationResult
}: FlowValidationDialogProps) {
  const errorCount = validationResult.issues.filter(i => i.severity === "error").length;
  const warningCount = validationResult.issues.filter(i => i.severity === "warning").length;
  const infoCount = validationResult.issues.filter(i => i.severity === "info").length;

  const getSeverityIcon = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {validationResult.isValid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Flow Validation Passed
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Flow Validation Issues Found
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {validationResult.isValid ? (
              "Your flow is properly configured and ready to save."
            ) : (
              <div className="space-y-1">
                <p>Your flow has some issues that should be addressed:</p>
                <div className="flex gap-4 text-sm font-medium mt-2">
                  {errorCount > 0 && (
                    <span className="text-destructive">
                      {errorCount} Error{errorCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-yellow-600">
                      {warningCount} Warning{warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {infoCount > 0 && (
                    <span className="text-blue-600">
                      {infoCount} Info
                    </span>
                  )}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {validationResult.issues.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {validationResult.issues.map((issue, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg border bg-muted/50"
              >
                {getSeverityIcon(issue.severity)}
                <div className="flex-1 text-sm">
                  {issue.message}
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {validationResult.isValid ? "Cancel" : "Go Back and Fix"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            {validationResult.isValid
              ? "Save Flow"
              : errorCount > 0
              ? "Save Anyway (Not Recommended)"
              : "Save Flow"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
