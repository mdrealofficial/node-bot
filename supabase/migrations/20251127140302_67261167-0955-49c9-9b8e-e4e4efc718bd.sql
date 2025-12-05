-- Create co_browse_sessions table
CREATE TABLE public.co_browse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  visitor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'declined')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create co_browse_events table for DOM snapshots and mutations
CREATE TABLE public.co_browse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.co_browse_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('snapshot', 'mutation', 'scroll', 'mouse', 'highlight')),
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_call_sessions table
CREATE TABLE public.video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  visitor_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'audio', 'screen')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'declined', 'missed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webrtc_signals table for WebRTC signaling
CREATE TABLE public.webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES public.video_call_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'visitor')),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice_candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.co_browse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_browse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_browse_sessions
CREATE POLICY "Agents can view their co-browse sessions"
  ON public.co_browse_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agents can create co-browse sessions"
  ON public.co_browse_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can update their co-browse sessions"
  ON public.co_browse_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for co_browse_events
CREATE POLICY "Agents can view events for their sessions"
  ON public.co_browse_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.co_browse_sessions
      WHERE co_browse_sessions.id = co_browse_events.session_id
      AND co_browse_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert co-browse events"
  ON public.co_browse_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for video_call_sessions
CREATE POLICY "Agents can view their video call sessions"
  ON public.video_call_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agents can create video call sessions"
  ON public.video_call_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can update their video call sessions"
  ON public.video_call_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for webrtc_signals
CREATE POLICY "Agents can view signals for their calls"
  ON public.webrtc_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.video_call_sessions
      WHERE video_call_sessions.id = webrtc_signals.call_session_id
      AND video_call_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert webrtc signals"
  ON public.webrtc_signals FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_co_browse_sessions_conversation ON public.co_browse_sessions(conversation_id);
CREATE INDEX idx_co_browse_sessions_user ON public.co_browse_sessions(user_id);
CREATE INDEX idx_co_browse_sessions_status ON public.co_browse_sessions(status);
CREATE INDEX idx_co_browse_events_session ON public.co_browse_events(session_id);
CREATE INDEX idx_co_browse_events_created ON public.co_browse_events(created_at);
CREATE INDEX idx_video_call_sessions_conversation ON public.video_call_sessions(conversation_id);
CREATE INDEX idx_video_call_sessions_user ON public.video_call_sessions(user_id);
CREATE INDEX idx_video_call_sessions_status ON public.video_call_sessions(status);
CREATE INDEX idx_webrtc_signals_call_session ON public.webrtc_signals(call_session_id);
CREATE INDEX idx_webrtc_signals_created ON public.webrtc_signals(created_at);

-- Enable Realtime for co_browse_events and webrtc_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.co_browse_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.co_browse_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_sessions;