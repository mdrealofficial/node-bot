import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Node,
  Edge,
  NodeMouseHandler,
  SelectionMode,
  ReactFlowInstance,
  EdgeTypes,
  OnConnectEnd,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Undo, Redo, Copy, Trash2, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, FlaskConical, Workflow, Maximize2, CheckCircle, Scissors, History as HistoryIcon } from "lucide-react";
import { FlowSidebar } from "./FlowSidebar";
import { ScissorsEdge } from "./edges/ScissorsEdge";
import { TextNode } from "./nodes/TextNode";
import { ImageNode } from "./nodes/ImageNode";
import { ButtonNode } from "./nodes/ButtonNode";
import { QuickReplyNode } from "./nodes/QuickReplyNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { StartNode } from "./nodes/StartNode";
import { AudioNode } from "./nodes/AudioNode";
import { VideoNode } from "./nodes/VideoNode";
import { FileNode } from "./nodes/FileNode";
import { CardNode } from "./nodes/CardNode";
import { CarouselNode } from "./nodes/CarouselNode";
import { CarouselItemNode } from "./nodes/CarouselItemNode";
import { ProductNode } from "./nodes/ProductNode";
import { SequenceNode } from "./nodes/SequenceNode";
import { InputNode } from "./nodes/InputNode";
import { AINode } from "./nodes/AINode";
import { NodeEditor } from "./NodeEditor";
import { KeywordTestPanel } from "./KeywordTestPanel";
import { validateFlow, FlowValidationDialog } from "./FlowValidation";
import { FlowVersionHistory } from "./FlowVersionHistory";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const nodeTypes = {
  start: StartNode,
  text: TextNode,
  image: ImageNode,
  button: ButtonNode,
  quickReply: QuickReplyNode,
  condition: ConditionNode,
  audio: AudioNode,
  video: VideoNode,
  file: FileNode,
  card: CardNode,
  carousel: CarouselNode,
  carouselItem: CarouselItemNode,
  product: ProductNode,
  sequence: SequenceNode,
  input: InputNode,
  ai: AINode,
};

const edgeTypes: EdgeTypes = {
  default: ScissorsEdge,
};

// Maximum number of outgoing connections per node type
const NODE_CONNECTION_LIMITS: Record<string, number> = {
  start: 1,
  condition: 2, // true and false branches
  text: 1,
  image: 1,
  button: Infinity, // Unlimited (one per button option)
  quickReply: 1,
  audio: 1,
  video: 1,
  file: 1,
  card: 1,
  carousel: Infinity, // Unlimited items + quick replies + next message
  carouselItem: 1, // Only one button per carousel item
  product: 1,
  sequence: 1,
  input: 1,
  ai: 1,
};

interface FlowBuilderProps {
  flowId: string;
  flowType: 'facebook' | 'instagram';
  onBack: () => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export const FlowBuilder = ({ flowId, flowType, onBack, onUnsavedChanges }: FlowBuilderProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useRef<ReactFlowInstance<any, any> | null>(null);
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [flowName, setFlowName] = useState("");
  const [triggerKeyword, setTriggerKeyword] = useState("");
  const [matchType, setMatchType] = useState<'exact' | 'partial'>('exact');
  const [saving, setSaving] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; issues: any[] }>({ isValid: true, issues: [] });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [executedNodeIds, setExecutedNodeIds] = useState<Set<string>>(new Set());
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentFlowVersion, setCurrentFlowVersion] = useState(1);
  
  // History management
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isInternalChange = useRef(false);
  const MAX_HISTORY_SIZE = 50;

  // Enhance nodes with connection count information and execution status
  const nodesWithConnectionInfo = useMemo(() => {
    return nodes.map(node => {
      const nodeType = node.type || 'text';
      const maxConnections = NODE_CONNECTION_LIMITS[nodeType] || 1;
      const currentConnections = edges.filter(edge => edge.source === node.id).length;
      
      const isExecuting = executingNodeId === node.id;
      const isExecuted = executedNodeIds.has(node.id);
      
      return {
        ...node,
        data: {
          ...node.data,
          connectionCount: currentConnections,
          maxConnections: maxConnections,
        },
        className: `${node.className || ''} ${isExecuting ? 'node-executing' : ''} ${isExecuted ? 'node-executed' : ''}`.trim(),
      };
    });
  }, [nodes, edges, executingNodeId, executedNodeIds]);

  useEffect(() => {
    loadFlow();
  }, [flowId]);

  // Notify parent about unsaved changes
  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  // Save to history whenever nodes or edges change
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (nodes.length === 0 && edges.length === 0) return;

    const newState: HistoryState = { nodes, edges };
    
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      newHistory.push(newState);
      
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    
    setCurrentHistoryIndex((prev) => {
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1);
      return newIndex;
    });
    
    setHasUnsavedChanges(true);
  }, [nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedNode) {
          handleDuplicateNode(selectedNode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentHistoryIndex, history, selectedNode]);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const previousState = history[currentHistoryIndex - 1];
      isInternalChange.current = true;
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      const nextState = history[currentHistoryIndex + 1];
      isInternalChange.current = true;
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);

  const loadFlow = async () => {
    try {
      const tableName = flowType === 'facebook' ? 'chatbot_flows' : 'instagram_chatbot_flows';
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", flowId)
        .single();

      if (error) throw error;

      setFlowName(data.name);
      setTriggerKeyword(data.trigger_keyword || "");
      setMatchType((data as any).match_type || 'exact');
      
      // Get latest version number (only for Facebook flows)
      if (flowType === 'facebook') {
        const { data: latestVersion } = await supabase
          .from("flow_versions")
          .select("version_number")
          .eq("flow_id", flowId)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();
        
        if (latestVersion) {
          setCurrentFlowVersion(latestVersion.version_number);
        }
      }
      
      if (data.flow_data && typeof data.flow_data === 'object') {
        const flowData = data.flow_data as { nodes?: Node[]; edges?: Edge[] };
        const loadedNodes = flowData.nodes || [];
        
        // Update start node with flow configuration
        const updatedNodes = loadedNodes.map(node => {
          if (node.type === "start") {
            return {
              ...node,
              data: {
                ...node.data,
                flowName: data.name,
                triggerKeyword: data.trigger_keyword || "",
                matchType: (data as any).match_type || 'exact'
              }
            };
          }
          return node;
        });
        
        // If no nodes exist (empty flow), add a Start node
        const finalNodes = updatedNodes.length === 0 ? [{
          id: 'start-1',
          type: 'start',
          position: { x: 250, y: 100 },
          data: {
            flowName: data.name,
            triggerKeyword: data.trigger_keyword || "",
            matchType: (data as any).match_type || 'exact'
          }
        }] : updatedNodes;
        
        setNodes(finalNodes);
        setEdges(flowData.edges || []);
        
        // If we added a Start node, save it immediately
        if (updatedNodes.length === 0 && finalNodes.length > 0) {
          const tableName = flowType === 'facebook' ? 'chatbot_flows' : 'instagram_chatbot_flows';
          await supabase
            .from(tableName)
            .update({
              flow_data: { nodes: finalNodes, edges: [] } as any
            })
            .eq("id", flowId);
        }
        
        // Initialize history with loaded state
        const initialState: HistoryState = {
          nodes: finalNodes,
          edges: flowData.edges || []
        };
        setHistory([initialState]);
        setCurrentHistoryIndex(0);
      }
    } catch (error: any) {
      toast.error("Failed to load flow: " + error.message);
    }
  };

  const handleSaveClick = () => {
    // Validate flow before saving
    const result = validateFlow(nodes, edges);
    setValidationResult(result);
    
    // Only show dialog if there are actual errors, not just warnings or info
    const hasErrors = result.issues.some(issue => issue.severity === 'error');
    if (hasErrors) {
      setShowValidationDialog(true);
    } else {
      saveFlow();
    }
  };

  const saveFlow = async () => {
    setSaving(true);
    setShowValidationDialog(false);
    try {
      const tableName = flowType === 'facebook' ? 'chatbot_flows' : 'instagram_chatbot_flows';
      const { error } = await supabase
        .from(tableName)
        .update({
          flow_data: { nodes, edges },
        })
        .eq("id", flowId);

      if (error) throw error;
      toast.success("Flow saved successfully");
      setHasUnsavedChanges(false);
      
      // Update current version number after save
      const { data: latestVersion } = await supabase
        .from("flow_versions")
        .select("version_number")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      
      if (latestVersion) {
        setCurrentFlowVersion(latestVersion.version_number);
      }
    } catch (error: any) {
      toast.error("Failed to save flow: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, flowData: any) => {
    try {
      setSaving(true);
      
      // Update the flow with the restored data
      const tableName = flowType === 'facebook' ? 'chatbot_flows' : 'instagram_chatbot_flows';
      const { error } = await supabase
        .from(tableName)
        .update({
          flow_data: flowData,
        })
        .eq("id", flowId);

      if (error) throw error;
      
      // Update local state with restored flow
      const restoredNodes = flowData.nodes || [];
      const updatedNodes = restoredNodes.map((node: Node) => {
        if (node.type === "start") {
          return {
            ...node,
            data: {
              ...node.data,
              flowName: flowName,
              triggerKeyword: triggerKeyword,
              matchType: matchType
            }
          };
        }
        return node;
      });
      
      isInternalChange.current = true;
      setNodes(updatedNodes);
      setEdges(flowData.edges || []);
      
      // Reset history with restored state
      const restoredState: HistoryState = {
        nodes: updatedNodes,
        edges: flowData.edges || []
      };
      setHistory([restoredState]);
      setCurrentHistoryIndex(0);
      setHasUnsavedChanges(false);
      
      // Update version number
      const { data: latestVersion } = await supabase
        .from("flow_versions")
        .select("version_number")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      
      if (latestVersion) {
        setCurrentFlowVersion(latestVersion.version_number);
      }
    } catch (error: any) {
      toast.error("Failed to restore version: " + error.message);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      // Clear connecting refs
      connectingNodeId.current = null;
      connectingHandleId.current = null;
      
      // Find the source node to check its type
      const sourceNode = nodes.find(n => n.id === params.source);
      if (!sourceNode) return;

      const nodeType = sourceNode.type || 'text';
      const sourceHandle = params.sourceHandle;

      setEdges((eds) => {
        // Special handling for text nodes with multiple handles
        if (nodeType === 'text' && sourceHandle) {
          // Define limits for each handle
          const handleLimits: Record<string, number> = {
            message: 1,
            buttons: 3,
            quickReplies: 13,
          };

          const maxConnections = handleLimits[sourceHandle] || 1;

          // Check mutual exclusivity: message and quickReplies cannot both have connections
          if (sourceHandle === 'message') {
            const hasQuickReplyConnections = eds.some(
              edge => edge.source === params.source && edge.sourceHandle === 'quickReplies'
            );
            if (hasQuickReplyConnections) {
              toast.error("Cannot connect 'Compose next message' when Quick Replies are connected. Disconnect Quick Replies first.");
              return eds;
            }
          }

          if (sourceHandle === 'quickReplies') {
            const hasMessageConnections = eds.some(
              edge => edge.source === params.source && edge.sourceHandle === 'message'
            );
            if (hasMessageConnections) {
              toast.error("Cannot connect Quick Replies when 'Compose next message' is connected. Disconnect message first.");
              return eds;
            }
          }

          // Count existing connections for this specific handle
          const existingConnectionsCount = eds.filter(
            edge => edge.source === params.source && edge.sourceHandle === sourceHandle
          ).length;

          // For single connection handles, replace the old connection
          if (maxConnections === 1) {
            const filteredEdges = eds.filter(
              (edge) => !(edge.source === params.source && edge.sourceHandle === sourceHandle)
            );
            
            if (eds.length > filteredEdges.length) {
              toast.info("Previous connection replaced");
            }
            
            return addEdge(params, filteredEdges);
          }

          // For multiple connection handles, check the limit
          if (existingConnectionsCount >= maxConnections) {
            const handleName = sourceHandle === 'quickReplies' ? 'Quick Reply' : sourceHandle === 'buttons' ? 'Button' : 'Message';
            toast.error(`Maximum ${maxConnections} ${handleName} connection${maxConnections > 1 ? 's' : ''} allowed`);
            return eds;
          }

          return addEdge(params, eds);
        }

        // Default behavior for other node types
        const maxConnections = NODE_CONNECTION_LIMITS[nodeType] || 1;

        // For nodes with single connection limit, remove the old one first
        if (maxConnections === 1) {
          const filteredEdges = eds.filter(
            (edge) => edge.source !== params.source
          );
          
          if (eds.length > filteredEdges.length) {
            toast.info("Previous connection replaced");
          }
          
          return addEdge(params, filteredEdges);
        }

        // For nodes with multiple connections, check the limit
        const existingConnectionsCount = eds.filter(
          edge => edge.source === params.source
        ).length;

        // Check if we're at the limit
        if (existingConnectionsCount >= maxConnections && maxConnections !== Infinity) {
          toast.error(`Maximum ${maxConnections} connection${maxConnections > 1 ? 's' : ''} allowed for ${nodeType} nodes`);
          return eds;
        }
        
        // Add the new connection
        return addEdge(params, eds);
      });
    },
    [nodes, setEdges]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setNodes((nds) => nds.filter((node) => !deleted.find((d) => d.id === node.id)));
    },
    [setNodes]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      setEdges((eds) => eds.filter((edge) => !deleted.find((d) => d.id === edge.id)));
    },
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    setEditingNode(node);
    setSelectedEdge(null); // Clear edge selection when clicking a node
  }, []);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
    // Auto-select node on hover
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
    setSelectedNode(node);
  }, [setNodes]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null); // Clear node selection when clicking an edge
  }, []);

  const handleDeleteEdge = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      toast.success("Connection deleted");
    }
  }, [selectedEdge, setEdges]);

  const handleDuplicateNode = useCallback((node: Node) => {
    if (node.type === "start") {
      toast.error("Cannot duplicate the start node");
      return;
    }

    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: {
        x: node.position.x + 250,
        y: node.position.y,
      },
      data: { ...node.data },
    };

    setNodes((nds) => [...nds, newNode]);
    toast.success("Node duplicated");
  }, [setNodes]);

  const handleDeleteNode = useCallback((node: Node) => {
    if (node.type === "start") {
      toast.error("Cannot delete the start node");
      return;
    }

    setNodes((nds) => nds.filter((n) => n.id !== node.id));
    setSelectedNode(null);
    toast.success("Node deleted");
  }, [setNodes]);

  const handleValidateNode = useCallback((node: Node) => {
    const { getDetailedValidationErrors } = require("./nodes/nodeValidation");
    const errors = getDetailedValidationErrors(node.type, node.data);
    
    if (errors.length === 0) {
      toast.success(`✓ ${node.type.toUpperCase()} node is valid`, {
        description: "All required fields are filled"
      });
    } else {
      toast.error(`Validation Failed`, {
        description: (
          <div className="mt-2">
            <p className="font-semibold mb-2">Please fill the following required fields:</p>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((error, idx) => (
                <li key={idx} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        ),
        duration: 6000
      });
      
      // Auto-open editor to let user fill the fields
      setEditingNode(node);
    }
  }, []);

  const onConnectStart = useCallback((event: any, { nodeId, handleId }: any) => {
    connectingNodeId.current = nodeId;
    connectingHandleId.current = handleId;
  }, []);

  const onConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      if (!connectingNodeId.current || !connectingHandleId.current) return;

      const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane');
      
      if (targetIsPane) {
        const sourceNode = nodes.find(n => n.id === connectingNodeId.current);
        const handleId = connectingHandleId.current;
        
        // Carousel special handles
        if (sourceNode?.type === 'carousel' && handleId === 'items') {
          const position = screenToFlowPosition({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });

          const newCarouselItemNode: Node = {
            id: `carouselItem-${Date.now()}`,
            type: 'carouselItem',
            position,
            data: {
              label: 'Carousel Item',
              title: '',
              subtitle: '',
              imageUrl: '',
              url: '',
            },
          };

          setNodes((nds) => nds.concat(newCarouselItemNode));
          
          const newEdge: Edge = {
            id: `e-${connectingNodeId.current}-${handleId}-${newCarouselItemNode.id}`,
            source: connectingNodeId.current,
            sourceHandle: handleId,
            target: newCarouselItemNode.id,
          };
          
          setEdges((eds) => eds.concat(newEdge));
          toast.success('Carousel Item created');
        }

        if (sourceNode?.type === 'carousel' && handleId === 'quickReplies') {
          const position = screenToFlowPosition({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });

          const newQuickReplyNode: Node = {
            id: `quickReply-${Date.now()}`,
            type: 'quickReply',
            position,
            data: {
              label: 'Quick Reply',
              replyText: '',
              actionType: 'next_message',
            },
          };

          setNodes((nds) => nds.concat(newQuickReplyNode));
          
          const newEdge: Edge = {
            id: `e-${connectingNodeId.current}-${handleId}-${newQuickReplyNode.id}`,
            source: connectingNodeId.current,
            sourceHandle: handleId,
            target: newQuickReplyNode.id,
          };
          
          setEdges((eds) => eds.concat(newEdge));
          toast.success('Quick Reply created');
        }

        // Carousel item button creation
        if (sourceNode?.type === 'carouselItem' && handleId === 'button') {
          const position = screenToFlowPosition({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });

          const newButtonNode: Node = {
            id: `button-${Date.now()}`,
            type: 'button',
            position,
            data: {
              label: 'Button',
              buttonName: '',
              actionType: 'next_message',
            },
          };

          setNodes((nds) => nds.concat(newButtonNode));
          
          const newEdge: Edge = {
            id: `e-${connectingNodeId.current}-${handleId}-${newButtonNode.id}`,
            source: connectingNodeId.current,
            sourceHandle: handleId,
            target: newButtonNode.id,
          };
          
          setEdges((eds) => eds.concat(newEdge));
          toast.success('Button created');
        }
        
        // Text node button/quick reply creation
        if (sourceNode?.type === 'text' && handleId === 'buttons') {
          const position = screenToFlowPosition({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });

          const newButtonNode: Node = {
            id: `button-${Date.now()}`,
            type: 'button',
            position,
            data: {
              label: 'Button',
              buttonName: '',
              actionType: 'next_message',
            },
          };

          setNodes((nds) => nds.concat(newButtonNode));
          
          const newEdge: Edge = {
            id: `e-${connectingNodeId.current}-${handleId}-${newButtonNode.id}`,
            source: connectingNodeId.current,
            sourceHandle: handleId,
            target: newButtonNode.id,
          };
          
          setEdges((eds) => eds.concat(newEdge));
          toast.success('Button node created');
        }
        
        if (sourceNode?.type === 'text' && handleId === 'quickReplies') {
          const position = screenToFlowPosition({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          });

          const newQuickReplyNode: Node = {
            id: `quickReply-${Date.now()}`,
            type: 'quickReply',
            position,
            data: {
              label: 'Quick Reply',
              replyText: '',
              actionType: 'next_message',
            },
          };

          setNodes((nds) => nds.concat(newQuickReplyNode));
          
          const newEdge: Edge = {
            id: `e-${connectingNodeId.current}-${handleId}-${newQuickReplyNode.id}`,
            source: connectingNodeId.current,
            sourceHandle: handleId,
            target: newQuickReplyNode.id,
          };
          
          setEdges((eds) => eds.concat(newEdge));
          toast.success('Quick Reply node created');
        }
      }
      
      connectingNodeId.current = null;
      connectingHandleId.current = null;
    },
    [nodes, setNodes, setEdges, screenToFlowPosition]
  );

  // Multi-node actions
  const handleDeleteSelectedNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected && n.type !== "start");
    if (selected.length === 0) return;

    setNodes((nds) => nds.filter((n) => !n.selected || n.type === "start"));
    setSelectedNodes([]);
    toast.success(`${selected.length} node(s) deleted`);
  }, [nodes, setNodes]);

  const handleCloneSelectedNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected && n.type !== "start");
    if (selected.length === 0) return;

    const newNodes = selected.map((node) => ({
      ...node,
      id: `${node.type}-${Date.now()}-${Math.random()}`,
      position: {
        x: node.position.x + 250,
        y: node.position.y,
      },
      selected: false,
      data: { ...node.data },
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    toast.success(`${selected.length} node(s) cloned`);
  }, [nodes, setNodes]);

  const handleAlignHorizontally = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length < 2) return;

    const avgY = selected.reduce((sum, n) => sum + n.position.y, 0) / selected.length;

    setNodes((nds) =>
      nds.map((node) =>
        node.selected
          ? { ...node, position: { ...node.position, y: avgY } }
          : node
      )
    );
    toast.success("Nodes aligned horizontally");
  }, [nodes, setNodes]);

  const handleAlignVertically = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length < 2) return;

    const avgX = selected.reduce((sum, n) => sum + n.position.x, 0) / selected.length;

    setNodes((nds) =>
      nds.map((node) =>
        node.selected
          ? { ...node, position: { ...node.position, x: avgX } }
          : node
      )
    );
    toast.success("Nodes aligned vertically");
  }, [nodes, setNodes]);

  // Track selected nodes
  useEffect(() => {
    const selected = nodes.filter((n) => n.selected);
    setSelectedNodes(selected);
  }, [nodes]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // Build adjacency list from edges
    const adjacencyList = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();
    
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
      incomingEdges.set(node.id, []);
    });
    
    edges.forEach(edge => {
      adjacencyList.get(edge.source)?.push(edge.target);
      incomingEdges.get(edge.target)?.push(edge.source);
    });

    // Find start node
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      toast.error("No start node found");
      return;
    }

    const HORIZONTAL_SPACING = 450; // Space between columns (left to right)
    const VERTICAL_SPACING = 180;   // Space between lanes/branches
    const NODE_HEIGHT = 120;        // Approximate node height

    // Assign each node to a column (level) and lane
    const nodeLayout = new Map<string, {column: number, lane: number}>();
    const columnLanes = new Map<number, number>(); // Track how many lanes each column has
    let maxLane = 0;

    // BFS to assign columns
    const queue: Array<{id: string, column: number, lane: number}> = [
      {id: startNode.id, column: 0, lane: 0}
    ];
    const visited = new Set<string>();
    
    nodeLayout.set(startNode.id, {column: 0, lane: 0});
    columnLanes.set(0, 1);
    visited.add(startNode.id);

    while (queue.length > 0) {
      const {id, column, lane} = queue.shift()!;
      const children = adjacencyList.get(id) || [];
      
      if (children.length === 0) continue;

      // Each child gets its own lane branching from parent's lane
      children.forEach((childId, index) => {
        if (visited.has(childId)) return;
        visited.add(childId);

        const childColumn = column + 1;
        const childLane = lane + (index * 1); // Branch off from parent lane
        
        nodeLayout.set(childId, {column: childColumn, lane: childLane});
        maxLane = Math.max(maxLane, childLane);
        
        // Update column lane count
        const currentLanes = columnLanes.get(childColumn) || 0;
        columnLanes.set(childColumn, Math.max(currentLanes, childLane + 1));
        
        queue.push({id: childId, column: childColumn, lane: childLane});
      });
    }

    // Calculate positions
    const nodePositions = new Map<string, {x: number, y: number}>();
    const newNodes = [...nodes];

    // Group nodes by column for better layout
    const nodesByColumn = new Map<number, Array<{id: string, lane: number}>>();
    nodeLayout.forEach(({column, lane}, id) => {
      if (!nodesByColumn.has(column)) {
        nodesByColumn.set(column, []);
      }
      nodesByColumn.get(column)!.push({id, lane});
    });

    // Position nodes
    nodesByColumn.forEach((nodesInColumn, column) => {
      const x = column * HORIZONTAL_SPACING;
      
      // Sort by lane
      nodesInColumn.sort((a, b) => a.lane - b.lane);
      
      // Compact lanes - remove gaps
      const laneMap = new Map<number, number>();
      let compactLane = 0;
      const uniqueLanes = [...new Set(nodesInColumn.map(n => n.lane))].sort((a, b) => a - b);
      uniqueLanes.forEach(originalLane => {
        laneMap.set(originalLane, compactLane++);
      });
      
      // Calculate vertical center
      const totalLanes = uniqueLanes.length;
      const totalHeight = (totalLanes - 1) * VERTICAL_SPACING;
      const startY = -totalHeight / 2;
      
      nodesInColumn.forEach(({id, lane}) => {
        const compactedLane = laneMap.get(lane) || 0;
        const y = startY + (compactedLane * VERTICAL_SPACING);
        nodePositions.set(id, {x, y});
      });
    });

    // Apply positions
    nodePositions.forEach((pos, nodeId) => {
      const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        newNodes[nodeIndex] = {
          ...newNodes[nodeIndex],
          position: pos
        };
      }
    });

    setNodes(newNodes);
    
    // Fit view
    setTimeout(() => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.fitView({ padding: 0.2, duration: 300 });
      }
    }, 50);
    
    toast.success("Nodes arranged in horizontal lanes");
  }, [nodes, edges, setNodes]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2, duration: 300 });
    }
  }, []);

  const handleNodeUpdate = useCallback(async (updatedData: any) => {
    if (!editingNode) return;

    // If updating start node, also update flow configuration
    if (editingNode.type === "start") {
      if (!updatedData.flowName || !String(updatedData.flowName).trim()) {
        toast.error("Flow name is required");
        return;
      }
      
      setFlowName(updatedData.flowName);
      setTriggerKeyword(updatedData.triggerKeyword || "");
      setMatchType(updatedData.matchType || 'exact');
      
      // Save to database immediately
      try {
        const tableName = flowType === 'facebook' ? 'chatbot_flows' : 'instagram_chatbot_flows';
        const { error } = await supabase
          .from(tableName)
          .update({
            name: updatedData.flowName,
            trigger_keyword: updatedData.triggerKeyword || null,
            match_type: updatedData.matchType || 'exact'
          })
          .eq("id", flowId);

        if (error) throw error;
        toast.success("Flow configuration updated");
      } catch (error: any) {
        toast.error("Failed to update flow configuration: " + error.message);
        return;
      }
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNode.id) {
          return {
            ...node,
            data: { ...node.data, ...updatedData },
          };
        }
        return node;
      })
    );
    setEditingNode(null);
  }, [editingNode, setNodes, flowId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance.current) return;

      // Use ReactFlow's screenToFlowPosition to properly convert coordinates
      // accounting for zoom and pan
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Block`,
          content: type === "text" ? "Enter your message here" : "",
          buttons: type === "button" ? [] : undefined,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-2 gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <h2 className="text-lg font-bold truncate max-w-xs">{flowName}</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleFitView}
                title="Fit all nodes in view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleAutoLayout}
                title="Auto-arrange nodes"
              >
                <Workflow className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowTestPanel(!showTestPanel);
                  // Reset execution tracking when closing test panel
                  if (showTestPanel) {
                    setExecutingNodeId(null);
                    setExecutedNodeIds(new Set());
                  }
                }}
                title="Test flow"
              >
                <FlaskConical className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleUndo}
                disabled={currentHistoryIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRedo}
                disabled={currentHistoryIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowVersionHistory(true)}
                title="Version History"
              >
                <HistoryIcon className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <Button onClick={handleSaveClick} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Vertical Block Types Sidebar */}
          <FlowSidebar />

          {/* Canvas Area */}
          <div className="flex-1 relative">
          <div className="absolute inset-0 bg-muted/20">
          {/* Multi-select toolbar */}
          {selectedNodes.length > 1 && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
              <span className="text-sm font-medium px-2">
                {selectedNodes.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCloneSelectedNodes}
                title="Clone selected nodes"
              >
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelectedNodes}
                title="Delete selected nodes"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
           )}
           
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="h-full w-full">
                <ReactFlow
                  nodes={nodesWithConnectionInfo}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  onNodesDelete={onNodesDelete}
                  onEdgesDelete={onEdgesDelete}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  onNodeMouseEnter={onNodeMouseEnter}
                  onEdgeClick={onEdgeClick}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  deleteKeyCode={["Backspace", "Delete"]}
                  selectionOnDrag
                  panOnDrag={[1, 2]}
                  selectionMode={SelectionMode.Partial}
                  fitView
                  translateExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
                  nodeExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
                  onInit={(instance) => (reactFlowInstance.current = instance)}
                >
                  <Controls position="bottom-right" style={{ bottom: 160, right: 10 }} />
                  <MiniMap position="bottom-right" />
                  <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {selectedNode && selectedNode.type !== "start" && (
                <>
                  <ContextMenuItem
                    onClick={() => handleValidateNode(selectedNode)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Validate
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleDuplicateNode(selectedNode)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Clone
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleDeleteNode(selectedNode)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </>
              )}
              {selectedNode && selectedNode.type === "start" && (
                <ContextMenuItem disabled>
                  Start node cannot be modified
                </ContextMenuItem>
              )}
              {!selectedNode && (
                <ContextMenuItem disabled>
                  Hover over a node first
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
          </div>  {/* Close absolute inset-0 canvas wrapper */}
          
          {/* Test Panel - Overlay */}
          {showTestPanel && (
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-background border-l shadow-2xl z-20 overflow-y-auto">
              <KeywordTestPanel 
                triggerKeyword={triggerKeyword}
                matchType={matchType}
                nodes={nodes}
                edges={edges}
                onNodeExecuted={(nodeId) => {
                  setExecutingNodeId(nodeId);
                  setExecutedNodeIds(prev => new Set([...prev, nodeId]));
                  // Clear executing status after animation
                  setTimeout(() => setExecutingNodeId(null), 1000);
                }}
                onExecutionComplete={() => {
                  setExecutingNodeId(null);
                }}
              />
            </div>
          )}
          </div>  {/* Close flex-1 canvas wrapper */}
        </div>  {/* Close flex container with sidebar */}
      </div>  {/* Close flex-1 flex-col main content */}

      {/* Modals */}
      {editingNode && (
        <NodeEditor
          open={!!editingNode}
          onClose={() => setEditingNode(null)}
          nodeType={editingNode.type || "text"}
          nodeData={editingNode.data}
          onSave={handleNodeUpdate}
        />
      )}

      <FlowValidationDialog
        open={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onProceed={saveFlow}
        validationResult={validationResult}
      />

      <FlowVersionHistory
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        flowId={flowId}
        currentVersion={currentFlowVersion}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
};
