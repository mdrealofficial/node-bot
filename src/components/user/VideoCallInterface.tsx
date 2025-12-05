import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, PhoneOff, X, Phone } from 'lucide-react';
import { WebRTCManager } from '@/utils/WebRTCManager';
import type { VideoCallSession, CallStats } from '@/types/videocall';

interface VideoCallInterfaceProps {
  conversationId: string;
  visitorId: string;
  onClose: () => void;
}

export default function VideoCallInterface({ conversationId, visitorId, onClose }: VideoCallInterfaceProps) {
  const { toast } = useToast();
  const [callSession, setCallSession] = useState<VideoCallSession | null>(null);
  const [callStats, setCallStats] = useState<CallStats>({
    videoEnabled: true,
    audioEnabled: true,
    screenSharing: false,
    connectionQuality: 'excellent'
  });
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const initiateCall = async (callType: 'video' | 'audio') => {
    try {
      // Create call session
      const { data: session, error: sessionError } = await supabase
        .from('video_call_sessions')
        .insert({
          conversation_id: conversationId,
          user_id: (await supabase.auth.getUser()).data.user!.id,
          visitor_id: visitorId,
          call_type: callType,
          status: 'pending'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setCallSession(session as VideoCallSession);

      // Initialize WebRTC
      webrtcManagerRef.current = new WebRTCManager({
        callSessionId: session.id,
        isInitiator: true,
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
        onConnectionStateChange: (state) => {
          console.log('Connection state:', state);
          if (state === 'connected') {
            updateCallStatus('active');
            startDurationTimer();
          } else if (state === 'failed' || state === 'disconnected') {
            endCall();
          }
        }
      });

      await webrtcManagerRef.current.initialize();
      const localStream = await webrtcManagerRef.current.startLocalMedia(callType);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Create offer
      await webrtcManagerRef.current.createOffer();

      toast({
        title: 'Call initiated',
        description: 'Waiting for visitor to accept...'
      });
    } catch (error: any) {
      console.error('Error initiating call:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call',
        variant: 'destructive'
      });
    }
  };

  const acceptCall = async (sessionId: string) => {
    try {
      // Load session
      const { data: session, error } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setCallSession(session as VideoCallSession);

      // Initialize WebRTC
      webrtcManagerRef.current = new WebRTCManager({
        callSessionId: session.id,
        isInitiator: false,
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            updateCallStatus('active');
            startDurationTimer();
          } else if (state === 'failed' || state === 'disconnected') {
            endCall();
          }
        }
      });

      await webrtcManagerRef.current.initialize();
      const localStream = await webrtcManagerRef.current.startLocalMedia(session.call_type as 'video' | 'audio' | 'screen');
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      updateCallStatus('active');
    } catch (error: any) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateCallStatus = async (status: string) => {
    if (!callSession) return;

    const updates: any = { status };
    if (status === 'active' && !callSession.started_at) {
      updates.started_at = new Date().toISOString();
    }

    await supabase
      .from('video_call_sessions')
      .update(updates)
      .eq('id', callSession.id);

    setCallSession(prev => prev ? { ...prev, ...updates } : null);
  };

  const toggleVideo = () => {
    if (!webrtcManagerRef.current) return;
    const newState = !callStats.videoEnabled;
    webrtcManagerRef.current.toggleVideo(newState);
    setCallStats(prev => ({ ...prev, videoEnabled: newState }));
  };

  const toggleAudio = () => {
    if (!webrtcManagerRef.current) return;
    const newState = !callStats.audioEnabled;
    webrtcManagerRef.current.toggleAudio(newState);
    setCallStats(prev => ({ ...prev, audioEnabled: newState }));
  };

  const toggleScreenShare = async () => {
    if (!webrtcManagerRef.current) return;

    try {
      if (callStats.screenSharing) {
        await webrtcManagerRef.current.stopScreenShare();
        setCallStats(prev => ({ ...prev, screenSharing: false }));
      } else {
        await webrtcManagerRef.current.switchToScreenShare();
        setCallStats(prev => ({ ...prev, screenSharing: true }));
        toast({ title: 'Screen sharing started' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to share screen',
        variant: 'destructive'
      });
    }
  };

  const endCall = async () => {
    try {
      if (callSession) {
        const duration = durationIntervalRef.current 
          ? Math.floor(callDuration) 
          : 0;

        await supabase
          .from('video_call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: duration
          })
          .eq('id', callSession.id);
      }

      cleanup();
      onClose();
    } catch (error: any) {
      console.error('Error ending call:', error);
      cleanup();
      onClose();
    }
  };

  const cleanup = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup();
      webrtcManagerRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="fixed inset-4 z-50 flex flex-col bg-gray-900 text-white border-none">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Video className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Video Call</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Badge variant={callSession?.status === 'active' ? 'default' : 'secondary'}>
                {callSession?.status || 'Idle'}
              </Badge>
              {callSession?.status === 'active' && (
                <span>{formatDuration(callDuration)}</span>
              )}
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 relative grid grid-cols-2 gap-4 p-4">
        {/* Remote video (visitor) */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-sm">
            Visitor
          </div>
        </div>

        {/* Local video (agent) */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-sm">
            You
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-800">
        {!callSession ? (
          <div className="flex justify-center gap-4">
            <Button onClick={() => initiateCall('video')} size="lg">
              <Video className="w-5 h-5 mr-2" />
              Start Video Call
            </Button>
            <Button onClick={() => initiateCall('audio')} variant="outline" size="lg">
              <Phone className="w-5 h-5 mr-2" />
              Start Audio Call
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <Button
              variant={callStats.audioEnabled ? 'default' : 'destructive'}
              size="lg"
              onClick={toggleAudio}
            >
              {callStats.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={callStats.videoEnabled ? 'default' : 'destructive'}
              size="lg"
              onClick={toggleVideo}
            >
              {callStats.videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={callStats.screenSharing ? 'secondary' : 'outline'}
              size="lg"
              onClick={toggleScreenShare}
            >
              {callStats.screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button variant="destructive" size="lg" onClick={endCall}>
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
