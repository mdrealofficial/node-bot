import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const widgetToken = url.searchParams.get('id');

  if (!widgetToken) {
    return new Response('Missing widget ID', { 
      status: 400,
      headers: corsHeaders
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const functionsUrl = `${supabaseUrl}/functions/v1`;
  const storageUrl = `${supabaseUrl}/storage/v1`;

  const widgetCode = `
(function() {
  'use strict';
  
  const WIDGET_TOKEN = '${widgetToken}';
  const API_URL = '${functionsUrl}';
  const STORAGE_URL = '${storageUrl}';
  const SUPABASE_URL = '${supabaseUrl}';
  const SUPABASE_KEY = '${supabaseKey}';
  
  function getVisitorToken() {
    let token = localStorage.getItem('_wc_visitor_token');
    if (!token) {
      token = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('_wc_visitor_token', token);
    }
    return token;
  }
  
  const visitorToken = getVisitorToken();
  let config = null;
  let isOpen = false;
  let unreadCount = 0;
  let messages = [];
  let conversationId = null;
  let supabaseClient = null;
  let realtimeChannel = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  let typingTimeout = null;
  let incomingCallSession = null;
  let coBrowseSession = null;
  let coBrowseCapture = null;
  let showPreChatForm = !localStorage.getItem('_wc_visitor_name');
  let visitorName = localStorage.getItem('_wc_visitor_name') || '';
  let visitorPhone = localStorage.getItem('_wc_visitor_phone') || '';
  
  // Load Supabase client
  async function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve(window.supabase);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Initialize conversation and realtime
  async function initConversation() {
    try {
      const response = await fetch(\`\${API_URL}/website-fetch-messages\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_token: WIDGET_TOKEN,
          visitor_token: visitorToken
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        conversationId = data.conversation_id;
        
        if (data.messages && data.messages.length > 0) {
          messages = data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'visitor' ? 'visitor' : 'agent',
            timestamp: msg.sent_at
          }));
          renderMessages();
        }
        
        // Now setup realtime
        await initRealtime();
      }
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  }
  
  // Setup Realtime
  async function initRealtime() {
    if (!conversationId) return;
    
    try {
      const supabaseLib = await loadSupabase();
      supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY);
      
      console.log('Setting up realtime for:', conversationId);
      updateConnectionStatus('connecting');
      
      realtimeChannel = supabaseClient
        .channel(\`chat:\${conversationId}\`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'website_messages',
          filter: \`conversation_id=eq.\${conversationId}\`
        }, (payload) => {
          console.log('New message via realtime:', payload);
          
          const newMsg = {
            id: payload.new.id,
            text: payload.new.message_text,
            sender: payload.new.sender_type === 'visitor' ? 'visitor' : 'agent',
            timestamp: payload.new.sent_at
          };
          
          if (!messages.find(m => m.id === newMsg.id)) {
            messages.push(newMsg);
            renderMessages();
            
            if (!isOpen && newMsg.sender === 'agent') {
              unreadCount++;
              updateBadge();
              playNotificationSound();
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'video_call_sessions',
          filter: \`conversation_id=eq.\${conversationId}\`
        }, (payload) => {
          if (payload.new.status === 'pending') {
            incomingCallSession = payload.new;
            showIncomingCallUI(payload.new);
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'co_browse_sessions',
          filter: \`conversation_id=eq.\${conversationId}\`
        }, (payload) => {
          if (payload.new.status === 'pending') {
            coBrowseSession = payload.new;
            showCoBrowseRequestUI(payload.new);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = realtimeChannel.presenceState();
          checkAgentTyping(state);
        })
        .subscribe((status) => {
          console.log('Realtime status:', status);
          if (status === 'SUBSCRIBED') {
            isConnected = true;
            reconnectAttempts = 0;
            updateConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isConnected = false;
            updateConnectionStatus('reconnecting');
            attemptReconnect();
          }
        });
      
      realtimeChannel.track({ typing: false, user: 'visitor' });
    } catch (error) {
      console.error('Failed to init realtime:', error);
      updateConnectionStatus('error');
    }
  }
  
  function updateConnectionStatus(status) {
    const statusEl = document.getElementById('_wc_status');
    if (!statusEl) return;
    
    const cfg = {
      connecting: { text: 'Connecting...', color: '#FFA500' },
      connected: { text: 'Online', color: '#10B981' },
      reconnecting: { text: 'Reconnecting...', color: '#F59E0B' },
      error: { text: 'Offline', color: '#EF4444' }
    };
    
    const c = cfg[status] || cfg.connected;
    statusEl.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: \${c.color};"></div>
        <span>\${c.text}</span>
      </div>
    \`;
  }
  
  function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      updateConnectionStatus('error');
      return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    setTimeout(() => {
      if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
      }
      initRealtime();
    }, delay);
  }
  
  function checkAgentTyping(state) {
    const agents = Object.values(state).filter(s => s[0]?.user === 'agent' && s[0]?.typing);
    const typingEl = document.getElementById('_wc_typing');
    if (typingEl) {
      typingEl.style.display = agents.length > 0 ? 'block' : 'none';
    }
  }
  
  function updateTypingStatus(typing) {
    if (realtimeChannel && isConnected) {
      realtimeChannel.track({ typing, user: 'visitor' });
    }
  }
  
  function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTUIGmm98OScTgwOUKXh8LVjHAU2jdXxxn0vBSp+zPDajj0JE12y6OulUxMJRp3e8r5tIgUpgM3y2Ik1CBlptO/jm04LDk6i4O+1Yx0GNo3V8cZ9LwUqfszw2o49CRNdsujrpVMTCUad3vK+bSIFKYDN8tmJNQgZabTv45tOCw5OouDvtWMdBjaN1fHGfS8FKn7M8NqOPQkTXbLo66VTEwlGnd7yvm0iBSmAzfLZiTUIGWm07+ObTgsOTqLg77VjHQY2jdXxxn0vBSp+zPDajj0JE12y6OulUxMJRp3e8r5tIgUpgM3y2Yk1CBlptO/jm04LDk6i4O+1Yx0GNo3V8cZ9LwUqfszw2o49CRNdsujrpVMTCUad3vK+bSIFKYDN8tmJNQgZabTv45tOCw5OouDvtWMdBjaN1fHGfS8FKn7M8NqOPQkTXbLo66VTEwlGnd7yvm0iBSmAzfLZiTUIGWm07+ObTgsOTqLg77VjHQY2jdXxxn0vBSp+zPDajj0JE12y6OulUxMJRp3e8r5tIgUpgM3y2Yk1CBlptO/jm04LDk6i4O+1Yx0GNo3V8cZ9LwUqfszw2o49CRNdsujrpVMTCUad3vK+bSIFKYDN8tmJNQgZabTv45tOCw5OouDvtWMdBjaN1fHGfS8FKn7M8NqOPQkTXbLo66VTEwlGnd7yvm0iBSmAzfLZiTUIGWm07+ObTgsO');
    audio.play().catch(() => {});
  }
  
  function showIncomingCallUI(session) {
    const callUI = document.createElement('div');
    callUI.id = '_wc_incoming_call';
    callUI.innerHTML = \`
      <div style="position: fixed; top: 20px; right: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); padding: 20px; z-index: 999999; max-width: 300px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="width: 64px; height: 64px; background: \${config.primary_color}; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-center;">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </div>
          <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600;">Incoming \${session.call_type === 'video' ? 'Video' : 'Audio'} Call</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">\${config.business_name}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="_wc_accept_call" style="flex: 1; background: #10b981; color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer;">
            Accept
          </button>
          <button id="_wc_decline_call" style="flex: 1; background: #ef4444; color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer;">
            Decline
          </button>
        </div>
      </div>
    \`;
    document.body.appendChild(callUI);
    
    document.getElementById('_wc_accept_call').onclick = () => acceptCall(session.id);
    document.getElementById('_wc_decline_call').onclick = () => declineCall(session.id);
    
    playNotificationSound();
  }
  
  function showCoBrowseRequestUI(session) {
    const coBrowseUI = document.createElement('div');
    coBrowseUI.id = '_wc_cobrowse_request';
    coBrowseUI.innerHTML = \`
      <div style="position: fixed; top: 20px; right: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); padding: 20px; z-index: 999999; max-width: 300px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="width: 64px; height: 64px; background: \${config.primary_color}; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
            </svg>
          </div>
          <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600;">Screen Sharing Request</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Agent wants to view your screen to assist you</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="_wc_accept_cobrowse" style="flex: 1; background: #10b981; color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer;">
            Accept
          </button>
          <button id="_wc_decline_cobrowse" style="flex: 1; background: #ef4444; color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer;">
            Decline
          </button>
        </div>
      </div>
    \`;
    document.body.appendChild(coBrowseUI);
    
    document.getElementById('_wc_accept_cobrowse').onclick = () => acceptCoBrowse(session.id);
    document.getElementById('_wc_decline_cobrowse').onclick = () => declineCoBrowse(session.id);
    
    playNotificationSound();
  }
  
  let activeCallPeer = null;
  let localStream = null;
  let remoteVideoElement = null;
  
  async function acceptCall(sessionId) {
    document.getElementById('_wc_incoming_call')?.remove();
    
    try {
      // Update session status
      await fetch(\`\${API_URL}/video-call-session\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', sessionId })
      });
      
      // Start video call UI
      showVideoCallUI(sessionId, incomingCallSession.call_type);
      
      // Initialize WebRTC
      await initWebRTC(sessionId, incomingCallSession.call_type === 'video');
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }
  
  async function declineCall(sessionId) {
    document.getElementById('_wc_incoming_call')?.remove();
    await fetch(\`\${API_URL}/video-call-session\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline', sessionId })
    });
  }
  
  async function acceptCoBrowse(sessionId) {
    document.getElementById('_wc_cobrowse_request')?.remove();
    
    try {
      // Update session status
      await fetch(\`\${API_URL}/co-browse-session\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', sessionId })
      });
      
      // Start co-browse capture
      await initCoBrowseCapture(sessionId);
      
      // Show co-browse active indicator
      showCoBrowseActiveUI(sessionId);
    } catch (error) {
      console.error('Failed to accept co-browse:', error);
    }
  }
  
  async function declineCoBrowse(sessionId) {
    document.getElementById('_wc_cobrowse_request')?.remove();
    await fetch(\`\${API_URL}/co-browse-session\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline', sessionId })
    });
  }
  
  function showVideoCallUI(sessionId, callType) {
    const callUI = document.createElement('div');
    callUI.id = '_wc_active_call';
    callUI.innerHTML = \`
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1a1a1a; z-index: 9999999; display: flex; flex-direction: column;">
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
          <video id="_wc_remote_video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
          <video id="_wc_local_video" autoplay playsinline muted style="position: absolute; bottom: 20px; right: 20px; width: 200px; height: 150px; border-radius: 8px; border: 2px solid white; object-fit: cover; \${callType === 'audio' ? 'display: none;' : ''}"></video>
          
          <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 12px 24px; border-radius: 24px; display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <span id="_wc_call_duration">00:00</span>
          </div>
        </div>
        
        <div style="background: rgba(0,0,0,0.9); padding: 24px; display: flex; justify-content: center; gap: 16px;">
          <button id="_wc_toggle_mic" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
          <button id="_wc_toggle_video" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; cursor: pointer; display: \${callType === 'audio' ? 'none' : 'flex'}; align-items: center; justify-content: center;">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
          <button id="_wc_end_call" style="width: 56px; height: 56px; border-radius: 50%; background: #ef4444; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      </div>
    \`;
    document.body.appendChild(callUI);
    
    // Start call duration timer
    let seconds = 0;
    const durationInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      const durationEl = document.getElementById('_wc_call_duration');
      if (durationEl) durationEl.textContent = \`\${mins}:\${secs}\`;
    }, 1000);
    
    let micEnabled = true;
    let videoEnabled = callType === 'video';
    
    document.getElementById('_wc_toggle_mic').onclick = async () => {
      micEnabled = !micEnabled;
      if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
      }
      document.getElementById('_wc_toggle_mic').innerHTML = micEnabled ? 
        '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>' :
        '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';
    };
    
    if (callType === 'video') {
      document.getElementById('_wc_toggle_video').onclick = async () => {
        videoEnabled = !videoEnabled;
        if (localStream) {
          localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
        }
        document.getElementById('_wc_toggle_video').innerHTML = videoEnabled ?
          '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>' :
          '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>';
      };
    }
    
    document.getElementById('_wc_end_call').onclick = async () => {
      clearInterval(durationInterval);
      endCall(sessionId);
    };
    
    remoteVideoElement = document.getElementById('_wc_remote_video');
  }
  
  async function initWebRTC(sessionId, includeVideo) {
    try {
      // Get local media
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: includeVideo
      });
      
      const localVideo = document.getElementById('_wc_local_video');
      if (localVideo) localVideo.srcObject = localStream;
      
      // Setup WebRTC peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      activeCallPeer = new RTCPeerConnection(configuration);
      
      // Add local tracks to peer connection
      localStream.getTracks().forEach(track => {
        activeCallPeer.addTrack(track, localStream);
      });
      
      // Handle remote stream
      activeCallPeer.ontrack = (event) => {
        if (remoteVideoElement) {
          remoteVideoElement.srcObject = event.streams[0];
        }
      };
      
      // Handle ICE candidates via Supabase
      activeCallPeer.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabaseClient.from('webrtc_signals').insert({
            session_id: sessionId,
            signal_type: 'ice-candidate',
            signal_data: event.candidate,
            sender: 'visitor'
          });
        }
      };
      
      // Listen for remote signals
      const signalChannel = supabaseClient
        .channel(\`webrtc:\${sessionId}\`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: \`session_id=eq.\${sessionId}\`
        }, async (payload) => {
          const signal = payload.new;
          if (signal.sender === 'agent') {
            if (signal.signal_type === 'offer') {
              await activeCallPeer.setRemoteDescription(signal.signal_data);
              const answer = await activeCallPeer.createAnswer();
              await activeCallPeer.setLocalDescription(answer);
              
              await supabaseClient.from('webrtc_signals').insert({
                session_id: sessionId,
                signal_type: 'answer',
                signal_data: answer,
                sender: 'visitor'
              });
            } else if (signal.signal_type === 'ice-candidate') {
              await activeCallPeer.addIceCandidate(signal.signal_data);
            }
          }
        })
        .subscribe();
    } catch (error) {
      console.error('WebRTC init failed:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
      endCall(sessionId);
    }
  }
  
  async function endCall(sessionId) {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    if (activeCallPeer) {
      activeCallPeer.close();
      activeCallPeer = null;
    }
    
    document.getElementById('_wc_active_call')?.remove();
    
    await fetch(\`\${API_URL}/video-call-session\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', sessionId })
    });
  }
  
  async function initCoBrowseCapture(sessionId) {
    // Create DOM observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(async (mutation) => {
        const eventData = {
          type: mutation.type,
          target: getElementPath(mutation.target),
          addedNodes: Array.from(mutation.addedNodes).map(node => serializeNode(node)),
          removedNodes: Array.from(mutation.removedNodes).map(node => serializeNode(node)),
          attributeName: mutation.attributeName,
          oldValue: mutation.oldValue
        };
        
        await supabaseClient.from('co_browse_events').insert({
          session_id: sessionId,
          event_type: 'dom-mutation',
          event_data: eventData
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
    
    // Track scroll events
    window.addEventListener('scroll', async () => {
      await supabaseClient.from('co_browse_events').insert({
        session_id: sessionId,
        event_type: 'scroll',
        event_data: { x: window.scrollX, y: window.scrollY }
      });
    }, { passive: true });
    
    // Track mouse movement (throttled)
    let lastMouseUpdate = 0;
    window.addEventListener('mousemove', async (e) => {
      const now = Date.now();
      if (now - lastMouseUpdate > 50) {
        lastMouseUpdate = now;
        await supabaseClient.from('co_browse_events').insert({
          session_id: sessionId,
          event_type: 'mouse-move',
          event_data: { x: e.clientX, y: e.clientY }
        });
      }
    }, { passive: true });
    
    // Send initial snapshot
    const snapshot = {
      html: document.documentElement.outerHTML,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    await supabaseClient.from('co_browse_events').insert({
      session_id: sessionId,
      event_type: 'snapshot',
      event_data: snapshot
    });
    
    coBrowseCapture = { observer, sessionId };
  }
  
  function getElementPath(element) {
    if (!(element instanceof Element)) return '';
    
    const path = [];
    while (element && element !== document.body) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
      } else if (element.className) {
        selector += '.' + element.className.split(' ').join('.');
      }
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(' > ');
  }
  
  function serializeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return { type: 'text', content: node.textContent };
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      return {
        type: 'element',
        tag: node.tagName.toLowerCase(),
        attributes: Array.from(node.attributes || []).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        children: Array.from(node.childNodes).map(child => serializeNode(child))
      };
    }
    return null;
  }
  
  function showCoBrowseActiveUI(sessionId) {
    const indicator = document.createElement('div');
    indicator.id = '_wc_cobrowse_active';
    indicator.innerHTML = \`
      <div style="position: fixed; top: 20px; right: 20px; background: \${config.primary_color}; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 999998; display: flex; align-items: center; gap: 12px;">
        <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
        </svg>
        <span style="font-weight: 600;">Screen Sharing Active</span>
        <button id="_wc_end_cobrowse" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">
          End
        </button>
      </div>
    \`;
    document.body.appendChild(indicator);
    
    document.getElementById('_wc_end_cobrowse').onclick = () => endCoBrowse(sessionId);
  }
  
  async function endCoBrowse(sessionId) {
    if (coBrowseCapture) {
      coBrowseCapture.observer.disconnect();
      coBrowseCapture = null;
    }
    
    document.getElementById('_wc_cobrowse_active')?.remove();
    
    await fetch(\`\${API_URL}/co-browse-session\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', sessionId })
    });
  }
  
  async function fetchConfig() {
    try {
      const response = await fetch(\`\${API_URL}/website-widget-config?widget_token=\${WIDGET_TOKEN}\`);
      if (response.ok) {
        config = await response.json();
        renderWidget();
        // Initialize conversation and realtime immediately
        await initConversation();
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  }
  
  async function submitPreChatForm() {
    const nameInput = document.getElementById('_wc_name_input');
    const phoneInput = document.getElementById('_wc_phone_input');
    
    const name = nameInput?.value?.trim();
    const phone = phoneInput?.value?.trim();
    
    if (!name) {
      alert('Please enter your name');
      return;
    }
    
    visitorName = name;
    visitorPhone = phone || '';
    showPreChatForm = false;
    
    localStorage.setItem('_wc_visitor_name', name);
    if (phone) localStorage.setItem('_wc_visitor_phone', phone);
    
    // Update visitor details in backend
    try {
      await fetch(\`\${API_URL}/website-widget-message\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_token: WIDGET_TOKEN,
          visitor_token: visitorToken,
          visitor_name: name,
          visitor_phone: phone || null,
          message: '',
          update_visitor_only: true,
          page_url: window.location.href,
          user_agent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Error updating visitor:', error);
    }
    
    updateChatContent();
    await initConversation();
  }
  
  async function sendMessage(text) {
    if (!text.trim()) return;
    
    try {
      const tempId = 'temp_' + Date.now();
      messages.push({
        id: tempId,
        text,
        sender: 'visitor',
        timestamp: new Date().toISOString()
      });
      renderMessages();
      
      const response = await fetch(\`\${API_URL}/website-widget-message\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_token: WIDGET_TOKEN,
          visitor_token: visitorToken,
          message: text,
          visitor_name: visitorName || 'Anonymous',
          visitor_phone: visitorPhone,
          page_url: window.location.href,
          user_agent: navigator.userAgent
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        conversationId = data.conversation_id;
        
        // Remove temp message, realtime will add real one
        messages = messages.filter(m => m.id !== tempId);
        
        // Setup realtime if not done
        if (!realtimeChannel) {
          await initRealtime();
        }
      }
    } catch (error) {
      console.error('Send failed:', error);
    }
  }
  
  function renderWidget() {
    if (!config) return;
    
    const container = document.createElement('div');
    container.id = '_wc_widget_container';
    container.innerHTML = \`
      <style>
        #_wc_widget_container {
          position: fixed;
          \${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
          bottom: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #_wc_launcher {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: \${config.primary_color};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          position: relative;
        }
        #_wc_launcher:hover {
          transform: scale(1.1);
        }
        #_wc_launcher svg {
          width: 28px;
          height: 28px;
          fill: white;
        }
        #_wc_badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: bold;
          display: none;
        }
        #_wc_window {
          display: none;
          position: fixed;
          \${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
          bottom: 90px;
          width: 370px;
          height: 550px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          flex-direction: column;
          overflow: hidden;
        }
        #_wc_window.open {
          display: flex;
        }
        #_wc_header {
          background: \${config.primary_color};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        #_wc_avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: \${config.primary_color};
        }
        #_wc_header_text h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        #_wc_header_text p {
          margin: 4px 0 0;
          font-size: 13px;
          opacity: 0.9;
        }
        #_wc_messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9fafb;
        }
        .wc-message {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
        }
        .wc-message.visitor {
          align-items: flex-end;
        }
        .wc-message-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
        }
        .wc-message.visitor .wc-message-bubble {
          background: \${config.primary_color};
          color: white;
        }
        .wc-message.agent .wc-message-bubble {
          background: white;
          color: #1f2937;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .wc-message-time {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }
        #_wc_typing {
          display: none;
          padding: 8px 20px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 13px;
          font-style: italic;
        }
        #_wc_input_area {
          padding: 16px;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
        }
        #_wc_input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
        }
        #_wc_send_btn {
          background: \${config.primary_color};
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          #_wc_window {
            width: 100%;
            height: 100%;
            bottom: 0;
            \${config.position === 'bottom-right' ? 'right: 0;' : 'left: 0;'}
            border-radius: 0;
          }
        }
      </style>
      
      <button id="_wc_launcher" aria-label="Open chat">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        <span id="_wc_badge"></span>
      </button>
      
      <div id="_wc_window">
        <div id="_wc_header">
          <div id="_wc_avatar">\${config.business_name.charAt(0).toUpperCase()}</div>
          <div id="_wc_header_text">
            <h3>\${config.business_name}</h3>
            <div id="_wc_status"></div>
          </div>
        </div>
        <div id="_wc_content" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;"></div>
      </div>
    \`;
    
    document.body.appendChild(container);
    
    document.getElementById('_wc_launcher').onclick = toggleWidget;
    
    updateChatContent();
    
    if (config.welcome_message && !showPreChatForm) {
      messages.push({
        id: Date.now(),
        text: config.welcome_message,
        sender: 'agent',
        timestamp: new Date().toISOString()
      });
      renderMessages();
    }
  }
  
  function updateChatContent() {
    const contentEl = document.getElementById('_wc_content');
    if (!contentEl || !config) return;
    
    if (showPreChatForm) {
      contentEl.innerHTML = \`
        <div id="_wc_pre_chat_form" style="padding: 24px; display: flex; flex-direction: column; justify-content: center; flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a202c;">Welcome! 👋</h3>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #718096;">Please provide your details to start chatting with us.</p>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #4a5568;">Name *</label>
            <input 
              id="_wc_name_input" 
              type="text" 
              placeholder="Enter your name"
              style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
            />
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #4a5568;">Phone Number (Optional)</label>
            <input 
              id="_wc_phone_input" 
              type="tel" 
              placeholder="Enter your phone number"
              style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
            />
          </div>
          
          <button 
            id="_wc_submit_form"
            style="width: 100%; padding: 12px; background: \${config.primary_color}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;"
          >
            Start Chat
          </button>
        </div>
      \`;
      
      const submitBtn = document.getElementById('_wc_submit_form');
      if (submitBtn) submitBtn.onclick = submitPreChatForm;
      
      const nameInput = document.getElementById('_wc_name_input');
      if (nameInput) {
        nameInput.onkeypress = (e) => {
          if (e.key === 'Enter') {
            const phoneInput = document.getElementById('_wc_phone_input');
            if (phoneInput) phoneInput.focus();
          }
        };
      }
      
      const phoneInput = document.getElementById('_wc_phone_input');
      if (phoneInput) {
        phoneInput.onkeypress = (e) => {
          if (e.key === 'Enter') submitPreChatForm();
        };
      }
    } else {
      contentEl.innerHTML = \`
        <div id="_wc_messages"></div>
        <div id="_wc_typing">Agent is typing...</div>
        <div id="_wc_input_area">
          <input type="text" id="_wc_input" placeholder="Type a message..." />
          <button id="_wc_send_btn" aria-label="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      \`;
      
      const sendBtn = document.getElementById('_wc_send_btn');
      if (sendBtn) sendBtn.onclick = handleSend;
      
      const input = document.getElementById('_wc_input');
      if (input) {
        input.onkeypress = (e) => {
          if (e.key === 'Enter') handleSend();
        };
        input.oninput = () => {
          updateTypingStatus(true);
          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => updateTypingStatus(false), 1000);
        };
      }
      
      renderMessages();
    }
  }
  
  function toggleWidget() {
    isOpen = !isOpen;
    const window = document.getElementById('_wc_window');
    if (isOpen) {
      window.classList.add('open');
      unreadCount = 0;
      updateBadge();
      document.getElementById('_wc_input')?.focus();
    } else {
      window.classList.remove('open');
    }
  }
  
  function handleSend() {
    const input = document.getElementById('_wc_input');
    const text = input.value.trim();
    if (text) {
      sendMessage(text);
      input.value = '';
      updateTypingStatus(false);
    }
  }
  
  function renderMessages() {
    const container = document.getElementById('_wc_messages');
    if (!container) return;
    
    container.innerHTML = messages.map(msg => \`
      <div class="wc-message \${msg.sender}">
        <div class="wc-message-bubble">\${msg.text}</div>
        <div class="wc-message-time">\${formatTime(msg.timestamp)}</div>
      </div>
    \`).join('');
    container.scrollTop = container.scrollHeight;
  }
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function updateBadge() {
    const badge = document.getElementById('_wc_badge');
    if (unreadCount > 0 && !isOpen) {
      badge.textContent = unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchConfig);
  } else {
    fetchConfig();
  }
})();
  `;

  return new Response(widgetCode, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300',
    },
  });
});