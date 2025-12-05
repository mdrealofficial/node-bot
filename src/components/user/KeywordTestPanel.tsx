import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Bot, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  buttons?: { label: string; payload: string }[];
  imageUrl?: string;
}

interface KeywordTestPanelProps {
  triggerKeyword: string;
  matchType: 'exact' | 'partial';
  nodes: any[];
  edges: any[];
  onNodeExecuted?: (nodeId: string) => void;
  onExecutionComplete?: () => void;
}

export const KeywordTestPanel = ({ triggerKeyword, matchType, nodes, edges, onNodeExecuted, onExecutionComplete }: KeywordTestPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [executedNodes, setExecutedNodes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const keywords = triggerKeyword
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const testMatch = (message: string): boolean => {
    if (!message.trim() || keywords.length === 0) return false;
    
    const lowerMessage = message.toLowerCase();
    
    if (matchType === 'exact') {
      return keywords.some(keyword => {
        const words = lowerMessage.split(/\s+/);
        return words.includes(keyword);
      });
    } else {
      return keywords.some(keyword => lowerMessage.includes(keyword));
    }
  };

  const findStartNode = () => {
    return nodes.find(node => node.type === 'start' || node.data?.isStart);
  };

  const findNextNode = (currentId: string, buttonPayload?: string) => {
    const edge = edges.find(e => {
      if (buttonPayload) {
        return e.source === currentId && e.sourceHandle === buttonPayload;
      }
      return e.source === currentId;
    });
    
    if (!edge) return null;
    return nodes.find(n => n.id === edge.target);
  };

  const executeNode = (node: any) => {
    if (!node) {
      onExecutionComplete?.();
      return;
    }

    // Mark node as executed
    setExecutedNodes(prev => new Set([...prev, node.id]));
    onNodeExecuted?.(node.id);

    const botMessage: Message = {
      id: Date.now().toString(),
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };

    switch (node.type) {
      case 'text':
        botMessage.text = node.data?.message || 'Text message';
        break;
      case 'image':
        botMessage.text = node.data?.caption || '';
        botMessage.imageUrl = node.data?.imageUrl;
        break;
      case 'button':
        botMessage.text = node.data?.message || 'Choose an option:';
        botMessage.buttons = node.data?.buttons || [];
        break;
      case 'condition':
        botMessage.text = 'Condition node (auto-proceeding)';
        break;
      default:
        botMessage.text = 'Unknown node type';
    }

    setMessages(prev => [...prev, botMessage]);
    setCurrentNodeId(node.id);

    // Auto-proceed for non-button nodes
    if (node.type !== 'button') {
      setTimeout(() => {
        const nextNode = findNextNode(node.id);
        if (nextNode) {
          executeNode(nextNode);
        } else {
          onExecutionComplete?.();
        }
      }, 500);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Check if message matches keywords
    if (testMatch(inputMessage)) {
      setTimeout(() => {
        const startNode = findStartNode();
        if (startNode) {
          const firstNode = findNextNode(startNode.id);
          if (firstNode) {
            executeNode(firstNode);
          }
        } else {
          // If no start node, execute first node
          const firstNode = nodes[0];
          if (firstNode) {
            executeNode(firstNode);
          }
        }
      }, 300);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "Sorry, I didn't understand that. Try using one of the trigger keywords.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }, 300);
    }
  };

  const handleButtonClick = (payload: string) => {
    if (!currentNodeId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: payload,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const nextNode = findNextNode(currentNodeId, payload);
      if (nextNode) {
        executeNode(nextNode);
      }
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentNodeId(null);
    setInputMessage("");
    setExecutedNodes(new Set());
    onExecutionComplete?.();
  };

  const handleQuickReply = (keyword: string) => {
    setInputMessage(keyword);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Simulator
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        <div className="flex gap-2 mt-2 text-xs flex-wrap">
          <Badge variant="secondary" className="text-xs">
            Trigger: {keywords.join(', ') || 'None'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {matchType === 'exact' ? 'Exact Match' : 'Partial Match'}
          </Badge>
          {executedNodes.size > 0 && (
            <Badge variant="default" className="text-xs bg-blue-500">
              Executed: {executedNodes.size} node{executedNodes.size !== 1 ? 's' : ''}
            </Badge>
          )}
          {currentNodeId && (
            <Badge variant="default" className="text-xs bg-green-500 animate-pulse">
              Testing...
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Send a message to start testing the flow</p>
                <p className="text-xs mt-1">Try using: {keywords.slice(0, 2).join(', ')}</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Message attachment"
                      className="rounded mb-2 max-w-full"
                    />
                  )}
                  {message.text && (
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  )}
                  {message.buttons && message.buttons.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      {message.buttons.map((button, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleButtonClick(button.payload || button.label)}
                          className="w-full"
                        >
                          {button.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Quick replies:</span>
              {keywords.map((keyword, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickReply(keyword)}
                  className="h-7 text-xs"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
