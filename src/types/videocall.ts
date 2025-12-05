export interface VideoCallSession {
  id: string;
  conversation_id: string;
  user_id: string;
  visitor_id: string;
  call_type: 'video' | 'audio' | 'screen';
  status: 'pending' | 'active' | 'ended' | 'declined' | 'missed';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface WebRTCSignal {
  id: string;
  call_session_id: string;
  sender_type: 'agent' | 'visitor';
  signal_type: 'offer' | 'answer' | 'ice_candidate';
  signal_data: any;
  created_at: string;
}

export interface CallStats {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate?: number;
  packetLoss?: number;
  latency?: number;
}
