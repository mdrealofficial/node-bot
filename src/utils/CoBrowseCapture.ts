import { supabase } from "@/integrations/supabase/client";
import type { DOMSnapshot, DOMMutation, ScrollEvent, MouseEvent as CoBrowseMouseEvent, HighlightEvent } from "@/types/cobrowse";

export class CoBrowseCapture {
  private sessionId: string;
  private mutationObserver: MutationObserver | null = null;
  private channel: any = null;
  private isCapturing = false;
  
  // Sensitive fields to mask
  private sensitiveSelectors = [
    'input[type="password"]',
    'input[type="text"][name*="card"]',
    'input[type="text"][name*="cvv"]',
    'input[type="text"][name*="ssn"]',
    '[data-sensitive]'
  ];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    // Capture initial DOM snapshot
    await this.captureSnapshot();

    // Start observing DOM mutations
    this.startMutationObserver();

    // Track scroll and mouse events
    this.setupEventListeners();

    // Subscribe to agent highlight commands
    await this.subscribeToAgentCommands();

    console.log('Co-browse capture started');
  }

  private async captureSnapshot() {
    const snapshot: DOMSnapshot = {
      html: this.serializeDOM(document.body),
      css: this.extractCSS(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href,
      timestamp: Date.now()
    };

    await this.sendEvent('snapshot', snapshot);
  }

  private serializeDOM(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Mask sensitive fields
    this.sensitiveSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => {
        if (el instanceof HTMLInputElement) {
          el.value = '***';
          el.setAttribute('data-masked', 'true');
        }
      });
    });

    return clone.outerHTML;
  }

  private extractCSS(): string {
    let css = '';
    
    // Extract inline styles
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach(rule => {
            css += rule.cssText + '\n';
          });
        }
      } catch (e) {
        // Cross-origin stylesheets
        console.warn('Could not access stylesheet:', e);
      }
    });

    return css;
  }

  private startMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        const mutationData: DOMMutation = {
          type: mutation.type,
          target: this.getElementPath(mutation.target as Element),
          timestamp: Date.now()
        };

        if (mutation.type === 'childList') {
          mutationData.addedNodes = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(node => this.serializeDOM(node as HTMLElement));
          
          mutationData.removedNodes = Array.from(mutation.removedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(node => (node as HTMLElement).tagName);
        } else if (mutation.type === 'attributes') {
          mutationData.attributeName = mutation.attributeName || undefined;
          mutationData.attributeValue = (mutation.target as Element).getAttribute(mutation.attributeName || '') || undefined;
        }

        this.sendEvent('mutation', mutationData);
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true
    });
  }

  private setupEventListeners() {
    // Scroll tracking
    window.addEventListener('scroll', () => {
      const scrollData: ScrollEvent = {
        x: window.scrollX,
        y: window.scrollY,
        timestamp: Date.now()
      };
      this.sendEvent('scroll', scrollData);
    }, { passive: true });

    // Mouse movement tracking (throttled)
    let lastMouseEvent = 0;
    window.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseEvent > 50) { // Throttle to 20fps
        lastMouseEvent = now;
        const mouseData: CoBrowseMouseEvent = {
          x: e.clientX,
          y: e.clientY,
          type: 'move',
          timestamp: now
        };
        this.sendEvent('mouse', mouseData);
      }
    }, { passive: true });

    // Mouse click tracking
    window.addEventListener('click', (e) => {
      const mouseData: CoBrowseMouseEvent = {
        x: e.clientX,
        y: e.clientY,
        type: 'click',
        timestamp: Date.now()
      };
      this.sendEvent('mouse', mouseData);
    });
  }

  private async subscribeToAgentCommands() {
    this.channel = supabase
      .channel(`cobrowse_commands:${this.sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'co_browse_events',
        filter: `session_id=eq.${this.sessionId}`
      }, (payload) => {
        if (payload.new.event_type === 'highlight') {
          this.handleAgentHighlight(payload.new.event_data);
        }
      })
      .subscribe();
  }

  private handleAgentHighlight(data: HighlightEvent) {
    const element = document.querySelector(data.selector);
    if (!element) return;

    const highlight = document.createElement('div');
    highlight.style.position = 'absolute';
    highlight.style.border = `3px solid ${data.color}`;
    highlight.style.borderRadius = '4px';
    highlight.style.pointerEvents = 'none';
    highlight.style.zIndex = '999999';
    highlight.style.transition = 'opacity 0.3s';

    const rect = element.getBoundingClientRect();
    highlight.style.top = `${rect.top + window.scrollY}px`;
    highlight.style.left = `${rect.left + window.scrollX}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;

    document.body.appendChild(highlight);

    // Fade out and remove
    setTimeout(() => {
      highlight.style.opacity = '0';
      setTimeout(() => highlight.remove(), 300);
    }, data.duration || 2000);
  }

  private getElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else if (current.className) {
        selector += `.${Array.from(current.classList).join('.')}`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  private async sendEvent(eventType: string, eventData: any) {
    try {
      await supabase.from('co_browse_events').insert({
        session_id: this.sessionId,
        event_type: eventType,
        event_data: eventData
      });
    } catch (error) {
      console.error('Error sending co-browse event:', error);
    }
  }

  async stop() {
    this.isCapturing = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    console.log('Co-browse capture stopped');
  }
}
