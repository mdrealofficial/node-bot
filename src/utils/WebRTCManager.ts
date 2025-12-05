import { supabase } from "@/integrations/supabase/client";

export type MediaType = 'video' | 'audio' | 'screen';

interface WebRTCConfig {
  callSessionId: string;
  isInitiator: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callSessionId: string;
  private isInitiator: boolean;
  private signalingChannel: any = null;
  
  private config: WebRTCConfig;

  // Google's public STUN servers
  private iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  constructor(config: WebRTCConfig) {
    this.config = config;
    this.callSessionId = config.callSessionId;
    this.isInitiator = config.isInitiator;
  }

  async initialize() {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal('ice_candidate', { candidate: event.candidate });
        }
      };

      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.config.onRemoteStream?.(this.remoteStream);
      };

      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection?.connectionState);
        this.config.onConnectionStateChange?.(this.peerConnection!.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
        this.config.onIceConnectionStateChange?.(this.peerConnection!.iceConnectionState);
      };

      // Subscribe to signaling channel
      await this.subscribeToSignals();

      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }

  async startLocalMedia(mediaType: MediaType = 'video') {
    try {
      let stream: MediaStream;

      if (mediaType === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        } as any);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: mediaType === 'video',
          audio: true
        });
      }

      this.localStream = stream;

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      console.log('Local media started:', mediaType);
      return stream;
    } catch (error) {
      console.error('Error starting local media:', error);
      throw error;
    }
  }

  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendSignal('offer', { sdp: offer });
      console.log('Offer created and sent');
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async createAnswer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      await this.sendSignal('answer', { sdp: answer });
      console.log('Answer created and sent');
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  async handleRemoteSignal(signalType: string, signalData: any) {
    if (!this.peerConnection) {
      console.error('Peer connection not initialized');
      return;
    }

    try {
      switch (signalType) {
        case 'offer':
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signalData.sdp)
          );
          await this.createAnswer();
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signalData.sdp)
          );
          break;

        case 'ice_candidate':
          if (signalData.candidate) {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(signalData.candidate)
            );
          }
          break;

        default:
          console.warn('Unknown signal type:', signalType);
      }
    } catch (error) {
      console.error('Error handling remote signal:', error);
    }
  }

  async switchToScreenShare() {
    if (!this.peerConnection || !this.localStream) {
      throw new Error('Call not active');
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      } as any);

      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Stop old video track
      this.localStream.getVideoTracks().forEach(track => track.stop());
      
      // Replace with screen track
      this.localStream.removeTrack(this.localStream.getVideoTracks()[0]);
      this.localStream.addTrack(videoTrack);

      // Handle screen share stop
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      console.log('Switched to screen share');
      return screenStream;
    } catch (error) {
      console.error('Error switching to screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.peerConnection || !this.localStream) return;

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      const videoTrack = videoStream.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Replace screen track with camera
      this.localStream.getVideoTracks().forEach(track => track.stop());
      this.localStream.removeTrack(this.localStream.getVideoTracks()[0]);
      this.localStream.addTrack(videoTrack);

      console.log('Stopped screen share');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  private async sendSignal(signalType: string, signalData: any) {
    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .insert({
          call_session_id: this.callSessionId,
          sender_type: this.isInitiator ? 'agent' : 'visitor',
          signal_type: signalType,
          signal_data: signalData
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending signal:', error);
      throw error;
    }
  }

  private async subscribeToSignals() {
    this.signalingChannel = supabase
      .channel(`webrtc_signals:${this.callSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `call_session_id=eq.${this.callSessionId}`
        },
        (payload) => {
          const signal = payload.new;
          // Ignore our own signals
          const senderType = this.isInitiator ? 'agent' : 'visitor';
          if (signal.sender_type === senderType) return;

          console.log('Received signal:', signal.signal_type);
          this.handleRemoteSignal(signal.signal_type, signal.signal_data);
        }
      )
      .subscribe();
  }

  async cleanup() {
    // Stop all tracks
    this.localStream?.getTracks().forEach(track => track.stop());
    this.remoteStream?.getTracks().forEach(track => track.stop());

    // Close peer connection
    this.peerConnection?.close();

    // Unsubscribe from signaling
    if (this.signalingChannel) {
      await supabase.removeChannel(this.signalingChannel);
    }

    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;

    console.log('WebRTC cleaned up');
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getConnectionState() {
    return this.peerConnection?.connectionState;
  }
}
