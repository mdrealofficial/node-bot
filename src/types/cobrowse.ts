export interface CoBrowseSession {
  id: string;
  conversation_id: string;
  user_id: string;
  visitor_id: string;
  status: 'pending' | 'active' | 'ended' | 'declined';
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CoBrowseEvent {
  id: string;
  session_id: string;
  event_type: 'snapshot' | 'mutation' | 'scroll' | 'mouse' | 'highlight';
  event_data: any;
  created_at: string;
}

export interface DOMSnapshot {
  html: string;
  css: string;
  viewport: {
    width: number;
    height: number;
  };
  url: string;
  timestamp: number;
}

export interface DOMMutation {
  type: 'childList' | 'attributes' | 'characterData';
  target: string; // CSS selector
  addedNodes?: string[];
  removedNodes?: string[];
  attributeName?: string;
  attributeValue?: string;
  oldValue?: string;
  timestamp: number;
}

export interface ScrollEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface MouseEvent {
  x: number;
  y: number;
  type: 'move' | 'click';
  timestamp: number;
}

export interface HighlightEvent {
  selector: string;
  color: string;
  duration?: number;
  timestamp: number;
}
