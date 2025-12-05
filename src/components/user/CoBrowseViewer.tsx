import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { X, MousePointer2, Highlighter, Eye, EyeOff } from 'lucide-react';
import type { CoBrowseSession, DOMSnapshot, DOMMutation, ScrollEvent, MouseEvent as CoBrowseMouseEvent } from '@/types/cobrowse';

interface CoBrowseViewerProps {
  sessionId: string;
  onClose: () => void;
}

export default function CoBrowseViewer({ sessionId, onClose }: CoBrowseViewerProps) {
  const { toast } = useToast();
  const [session, setSession] = useState<CoBrowseSession | null>(null);
  const [isViewingScreen, setIsViewingScreen] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#3b82f6');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadSession();
    subscribeToEvents();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('co_browse_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data as CoBrowseSession);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load co-browse session',
        variant: 'destructive'
      });
    }
  };

  const subscribeToEvents = () => {
    channelRef.current = supabase
      .channel(`cobrowse_viewer:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'co_browse_events',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        handleEvent(payload.new);
      })
      .subscribe();
  };

  const handleEvent = (event: any) => {
    const { event_type, event_data } = event;

    switch (event_type) {
      case 'snapshot':
        renderSnapshot(event_data as DOMSnapshot);
        break;
      case 'mutation':
        applyMutation(event_data as DOMMutation);
        break;
      case 'scroll':
        applyScroll(event_data as ScrollEvent);
        break;
      case 'mouse':
        updateCursor(event_data as CoBrowseMouseEvent);
        break;
    }
  };

  const renderSnapshot = (snapshot: DOMSnapshot) => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>${snapshot.css}</style>
          <style>
            body { pointer-events: none; }
            [data-masked] { filter: blur(8px); }
          </style>
        </head>
        <body>${snapshot.html}</body>
      </html>
    `);
    doc.close();

    setIsViewingScreen(true);
  };

  const applyMutation = (mutation: DOMMutation) => {
    if (!iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const target = doc.querySelector(mutation.target);
    if (!target) return;

    if (mutation.type === 'attributes' && mutation.attributeName) {
      target.setAttribute(mutation.attributeName, mutation.attributeValue || '');
    } else if (mutation.type === 'childList') {
      // Handle added/removed nodes
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach(nodeName => {
          const child = Array.from(target.children).find(
            c => c.tagName === nodeName
          );
          if (child) child.remove();
        });
      }
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(html => {
          const temp = doc.createElement('div');
          temp.innerHTML = html;
          target.appendChild(temp.firstChild!);
        });
      }
    }
  };

  const applyScroll = (scroll: ScrollEvent) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.scrollTo(scroll.x, scroll.y);
  };

  const updateCursor = (mouse: CoBrowseMouseEvent) => {
    if (!cursorRef.current) return;

    cursorRef.current.style.left = `${mouse.x}px`;
    cursorRef.current.style.top = `${mouse.y}px`;
    cursorRef.current.style.display = 'block';

    if (mouse.type === 'click') {
      // Animate click
      cursorRef.current.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = 'scale(1)';
        }
      }, 200);
    }
  };

  const sendHighlight = (selector: string) => {
    supabase.from('co_browse_events').insert({
      session_id: sessionId,
      event_type: 'highlight',
      event_data: {
        selector,
        color: highlightColor,
        duration: 3000,
        timestamp: Date.now()
      }
    });
  };

  const handleIframeClick = (e: React.MouseEvent) => {
    if (!iframeRef.current?.contentDocument) return;

    const rect = iframeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const doc = iframeRef.current.contentDocument;
    const element = doc.elementFromPoint(x, y);

    if (element) {
      const selector = getElementSelector(element);
      sendHighlight(selector);
      toast({ title: 'Element highlighted for visitor' });
    }
  };

  const getElementSelector = (element: Element): string => {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = Array.from(element.classList).join('.');
      return `${element.tagName.toLowerCase()}.${classes}`;
    }
    return element.tagName.toLowerCase();
  };

  const endSession = async () => {
    try {
      const { error } = await supabase
        .from('co_browse_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      toast({ title: 'Co-browse session ended' });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (!session) {
    return <div className="p-4">Loading session...</div>;
  }

  return (
    <Card className="fixed inset-4 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Co-Browsing Session</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
              {isViewingScreen && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Highlighter className="w-4 h-4" />
            <input
              type="color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <Button variant="outline" size="sm" onClick={endSession}>
            End Session
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-muted overflow-hidden">
        {!isViewingScreen ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <EyeOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Waiting for visitor screen...</p>
            </div>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              className="w-full h-full bg-white"
              onClick={handleIframeClick}
              title="Visitor Screen"
            />
            <div
              ref={cursorRef}
              className="absolute w-6 h-6 pointer-events-none transition-transform"
              style={{ display: 'none' }}
            >
              <MousePointer2 className="w-6 h-6 text-red-500 drop-shadow-lg" />
            </div>
          </>
        )}
      </div>

      <div className="p-3 border-t bg-muted/50 text-xs text-muted-foreground">
        <p>💡 Click on any element in the visitor's screen to highlight it for them</p>
      </div>
    </Card>
  );
}
