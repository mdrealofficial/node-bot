import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, MessageSquare, Smile, Paperclip, X, Search, FileText, AlertTriangle, Settings, Scan, Facebook, Instagram, ShoppingCart, Package, Tag, MessageCircle, Plus, AlertCircle, Archive, Trash2, Volume2, VolumeX, Bell, Mic, Square, Play, Pause, Globe, Video, Monitor } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPrice } from '@/lib/currencyUtils';
import VideoCallInterface from '@/components/user/VideoCallInterface';
import CoBrowseViewer from '@/components/user/CoBrowseViewer';
import LiveChatSalesPanel from '@/components/user/LiveChatSalesPanel';
interface Conversation {
  id: string;
  subscriber_id?: string;
  visitor_id?: string;
  page_id?: string;
  instagram_account_id?: string;
  widget_id?: string;
  last_message_at: string;
  last_message_text: string | null;
  unread_count: number;
  platform?: 'facebook' | 'instagram' | 'website';
  subscriber?: {
    subscriber_name: string | null;
    subscriber_psid?: string;
    subscriber_instagram_id?: string;
    subscriber_username?: string | null;
    profile_pic_url: string | null;
  };
  visitor?: {
    visitor_name: string | null;
    visitor_email: string | null;
  };
  facebook_pages?: {
    page_name: string;
  };
  instagram_accounts?: {
    account_name: string;
  };
  website_widgets?: {
    widget_name: string;
    business_name: string;
  };
}
interface Message {
  id: string;
  sender_type: 'user' | 'subscriber';
  message_text: string;
  sent_at: string;
  status?: 'sent' | 'delivered' | 'read';
  attachment_url?: string | null;
  attachment_type?: string | null;
}
interface CannedMessage {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
}
interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
  page_logo_url?: string | null;
  page_access_token: string;
}

interface InstagramAccount {
  id: string;
  account_name: string;
  instagram_username: string;
  profile_picture_url?: string | null;
  access_token: string;
}
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  store_id: string;
}
const LiveChat = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'website' | 'all'>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const [connectedPages, setConnectedPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanDuration, setScanDuration] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [selectedMessageTag, setSelectedMessageTag] = useState<string>('HUMAN_AGENT');
  const [defaultMessageTag, setDefaultMessageTag] = useState<string>('HUMAN_AGENT');
  const [savingPreference, setSavingPreference] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [showDecimals, setShowDecimals] = useState<boolean>(true);
  const [showCannedMessages, setShowCannedMessages] = useState(false);
  const [cannedMessages, setCannedMessages] = useState<CannedMessage[]>([]);
  const [newCannedMessage, setNewCannedMessage] = useState({ name: '', content: '' });
  const [showAddCanned, setShowAddCanned] = useState(false);
  
  // Phase 1: New states for keyboard shortcuts, labels, search, notifications
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [labels, setLabels] = useState<Array<{id: string; name: string; color: string}>>([]);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3b82f6' });
  const [contextMenuConversation, setContextMenuConversation] = useState<Conversation | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showCoBrowse, setShowCoBrowse] = useState(false);
  const [conversationsNeedingRefresh, setConversationsNeedingRefresh] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate consistent color for page badge based on page_id
  const getPageColor = (pageId: string): string => {
    const colors = ['bg-primary', 'bg-accent', 'bg-success', 'bg-warning', 'bg-instagram', 'bg-facebook', 'bg-secondary', 'bg-muted'];
    // Simple hash function to get consistent color for each page
    const hash = pageId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Check if conversation is within 24-hour messaging window
  const isWithin24HourWindow = (lastMessageAt: string): boolean => {
    const lastMessageTime = new Date(lastMessageAt);
    const now = new Date();
    const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastMessage <= 24;
  };
  const getWindowStatus = (lastMessageAt: string): string => {
    const lastMessageTime = new Date(lastMessageAt);
    const now = new Date();
    const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    const hoursAgo = Math.floor(hoursSinceLastMessage);
    return `Last message ${hoursAgo} hours ago`;
  };

  // Phase 1: Label Management Functions
  const loadLabels = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('conversation_labels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  const createLabel = async () => {
    if (!user || !newLabel.name.trim()) return;
    try {
      const { error } = await supabase
        .from('conversation_labels')
        .insert({
          user_id: user.id,
          name: newLabel.name.trim(),
          color: newLabel.color
        });

      if (error) throw error;
      toast({ title: 'Label created successfully' });
      setNewLabel({ name: '', color: '#3b82f6' });
      setShowLabelDialog(false);
      loadLabels();
    } catch (error: any) {
      toast({ title: 'Error creating label', description: error.message, variant: 'destructive' });
    }
  };

  const assignLabel = async (conversationId: string, labelId: string, conversationType: 'facebook' | 'instagram') => {
    try {
      const { error } = await supabase
        .from('conversation_label_assignments')
        .insert({
          conversation_id: conversationId,
          label_id: labelId,
          conversation_type: conversationType
        });

      if (error) throw error;
      toast({ title: 'Label assigned' });
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Label already assigned', variant: 'destructive' });
      } else {
        toast({ title: 'Error assigning label', description: error.message, variant: 'destructive' });
      }
    }
  };

  const deleteLabel = async (labelId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;
      toast({ title: 'Label deleted' });
      loadLabels();
    } catch (error: any) {
      toast({ title: 'Error deleting label', description: error.message, variant: 'destructive' });
    }
  };

  // Phase 1: Notification Functions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast({ title: 'Notifications enabled' });
      }
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return; // Don't play if muted
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0OVqvn77BdGgs9mNz0v3AuByd7yfDZizoIDlOo5O+wXhoLPpjc9L5wLgcnfMny2Ys5CA5TqOTvsF0aCz6Y3PS/cC4HJ3zJ8tmLOQgOU6jk77BeGgs+mNz0vnAuByd8yfLYizkIDlSo5O+wXRsLPpjc9L9wLgcnfMny2Is5CA5UqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgOVKjk77BdGws+mNz0vnAuByd8yfLYizkIDlSo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA5UqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgOVKjk77BdGws+mNz0vnAuByd8yfLYizkIDlSo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA5UqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgNU6jk77BdGws+mNz0vnAuByd8yfLYizkIDVOo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA1TqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgNU6jk77BdGws+mNz0vnAuByd8yfLYizkIDVOo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA1TqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgNU6jk77BdGws+mNz0vnAuByd8yfLYizkIDVOo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA1TqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgNU6jk77BdGws+mNz0vnAuByd8yfLYizkIDVOo5O+wXRsLPpjc9L5wLgcnfMny2Is5CA1TqOTvsF0bCz6Y3PS+cC4HJ3zJ8tiLOQgNU6jk77BdGws+mNz0vnAuByd8yfLYizkIDVOo5O+wXRsLPpjc9L5wLgcnfMny2Is5');
    audio.play().catch(e => console.log('Could not play sound:', e));
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    // Play sound for new messages if enabled
    if (soundEnabled) {
      playNotificationSound();
    }
    
    // Show browser notification if enabled and permission granted
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: icon || '/placeholder.svg', tag: 'live-chat' });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setAudioChunks([]);
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Speak now...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedConversation) return;

    // Create temporary blob URL for immediate playback
    const tempBlobUrl = URL.createObjectURL(audioBlob);
    
    // Create optimistic message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_type: 'user' as const,
      message_text: '🎤 Voice message',
      sent_at: new Date().toISOString(),
      status: 'sending' as const,
      attachment_url: tempBlobUrl,
      attachment_type: 'audio/webm',
      facebook_message_id: null,
      instagram_message_id: null,
      created_at: new Date().toISOString()
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, optimisticMessage as any]);

    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `voice-messages/${user?.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const conversationPlatform = platform === 'all' 
        ? (selectedConversation as any).platform 
        : platform;

      if (conversationPlatform === 'facebook') {
        const page = connectedPages.find(p => p.id === selectedConversation.page_id);
        if (!page) throw new Error('Page not found');

        const { error } = await supabase.functions.invoke('send-message', {
          body: {
            pageAccessToken: page.page_access_token,
            recipientPsid: selectedConversation.subscriber.subscriber_psid,
            conversationId: selectedConversation.id,
            attachmentUrl: publicUrl,
            attachmentType: 'audio/webm'
          }
        });

        if (error) throw error;
      } else {
        const account = instagramAccounts.find(a => a.id === selectedConversation.instagram_account_id);
        if (!account) throw new Error('Instagram account not found');

        const { error } = await supabase.functions.invoke('instagram-send-message', {
          body: {
            instagramAccountId: selectedConversation.instagram_account_id,
            recipientId: selectedConversation.subscriber.subscriber_instagram_id,
            accessToken: account.access_token,
            attachmentUrl: publicUrl,
            attachmentType: 'audio/webm'
          }
        });

        if (error) throw error;
      }

      // Update optimistic message with real URL and sent status
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'sent', attachment_url: publicUrl } : msg
      ));
      
      // Clean up blob URL
      URL.revokeObjectURL(tempBlobUrl);

      toast({
        title: "Voice message sent",
      });
    } catch (error: any) {
      console.error('Error sending voice message:', error);
      
      // Parse error message
      let errorMessage = error.message || 'Failed to send voice message';
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          errorMessage = errorBody.error || errorMessage;
        } catch (e) {
          // If parsing fails, use the original error message
        }
      }
      
      // Update optimistic message to failed status with error
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed', error: errorMessage } as any : msg
      ));
      
      // Clean up blob URL
      URL.revokeObjectURL(tempBlobUrl);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 7000
      });
    }
  };

  const toggleAudioPlayback = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingAudio(audioUrl);

      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Phase 1: Filter messages by search query
  const filteredMessages = messages.filter(msg =>
    !messageSearchQuery || msg.message_text.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  useEffect(() => {
    if (user) {
      loadConnectedPages();
      loadInstagramAccounts();
      loadUserPreferences();
      loadProducts();
      loadCannedMessages();
      loadLabels();
    }
  }, [user]);

  // Phase 1: Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - Close search/emoji picker/product panel
      if (e.key === 'Escape') {
        setShowMessageSearch(false);
        setShowEmojiPicker(false);
        setShowProductPanel(false);
        setShowCannedMessages(false);
      }
      // Ctrl/Cmd + K - Toggle message search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowMessageSearch(prev => !prev);
      }
      // Ctrl/Cmd + / - Show keyboard shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toast({
          title: 'Keyboard Shortcuts',
          description: (
            <div className="space-y-1 text-sm">
              <div><strong>Esc</strong> - Close panels</div>
              <div><strong>Ctrl+K</strong> - Search messages</div>
              <div><strong>Ctrl+Enter</strong> - Send message</div>
            </div>
          )
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Phase 1: Request notification permission on mount and load sound preference
  useEffect(() => {
    // Load sound preference from localStorage
    const savedSoundPref = localStorage.getItem('liveChatSoundEnabled');
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true');
    }
    
    if ('Notification' in window && Notification.permission === 'default') {
      // Auto-request after a short delay to not be intrusive
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, selectedPageId, platform, connectedPages, instagramAccounts]);

  // Timer for scan duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (scanning) {
      setScanDuration(0);
      interval = setInterval(() => {
        setScanDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanning]);
  // Realtime subscription for website messages
  useEffect(() => {
    if (platform !== 'website' || !selectedConversation?.id) return;

    const channel = supabase
      .channel(`agent-chat:${selectedConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'website_messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload) => {
        // Only add messages from visitors (not our own sent messages)
        // Agent messages are already added optimistically when sending
        if (payload.new.sender_type !== 'visitor') return;
        
        const newMsg: Message = {
          id: payload.new.id,
          message_text: payload.new.message_text,
          sender_type: 'subscriber',
          sent_at: payload.new.sent_at,
          attachment_url: payload.new.attachment_url,
          attachment_type: payload.new.attachment_type
        };
        
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // Play notification sound for new visitor messages
        if (!document.hasFocus() && soundEnabled) {
          playNotificationSound();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [platform, selectedConversation?.id, soundEnabled]);

  useEffect(() => {
    if (selectedConversation) {
      // Load messages immediately without loading state to prevent "refresh" feeling
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      // Set message tag based on conversation preference or global default
      const preferredTag = (selectedConversation as any).preferred_message_tag || defaultMessageTag;
      setSelectedMessageTag(preferredTag);
      // Clear file and reset states when switching conversations
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewMessage('');
    } else {
      // Clear messages when no conversation is selected
      setMessages([]);
    }
  }, [selectedConversation, defaultMessageTag]);
  useEffect(() => {
    // Jump directly to the latest message without animation
    messagesEndRef.current?.scrollIntoView({
      behavior: 'instant'
    });
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to fetch new conversation with retry logic
  const fetchNewConversationWithRetry = async (
    convId: string, 
    table: 'conversations' | 'instagram_conversations' | 'website_conversations',
    platformType: 'facebook' | 'instagram' | 'website',
    maxRetries = 3
  ) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      
      try {
        let query;
        if (platformType === 'facebook') {
          query = supabase
            .from('conversations')
            .select(`
              *,
              subscriber:subscribers(subscriber_name, subscriber_psid, profile_pic_url),
              facebook_pages(page_name),
              preferred_message_tag
            `)
            .eq('id', convId)
            .single();
        } else if (platformType === 'instagram') {
          query = supabase
            .from('instagram_conversations')
            .select(`
              *,
              subscriber:instagram_subscribers(subscriber_name, subscriber_instagram_id, profile_pic_url, subscriber_username),
              instagram_accounts(account_name)
            `)
            .eq('id', convId)
            .single();
        } else {
          query = supabase
            .from('website_conversations')
            .select(`
              *,
              visitor:website_visitors(visitor_name, visitor_email),
              website_widgets(widget_name, business_name)
            `)
            .eq('id', convId)
            .single();
        }

        const { data, error } = await query;

        if (data && !error && (
          (platformType === 'facebook' && data.subscriber) ||
          (platformType === 'instagram' && data.subscriber) ||
          (platformType === 'website' && data.visitor)
        )) {
          return { data, success: true, needsRefresh: false };
        }
      } catch (err) {
        console.warn(`Retry attempt ${attempt + 1} failed:`, err);
      }
    }
    
    // Final fallback: fetch basic conversation without joins
    try {
      const { data: basicData } = await supabase
        .from(table)
        .select('*')
        .eq('id', convId)
        .single();
        
      if (basicData) {
        // Mark this conversation as needing refresh
        setConversationsNeedingRefresh(prev => new Set(prev).add(convId));
        
        return { 
          data: {
            ...basicData,
            subscriber: platformType !== 'website' ? {
              subscriber_name: 'Loading...',
              subscriber_psid: '',
              subscriber_instagram_id: '',
              profile_pic_url: null
            } : undefined,
            visitor: platformType === 'website' ? {
              visitor_name: 'Loading...',
              visitor_email: null
            } : undefined
          }, 
          success: false, 
          needsRefresh: true 
        };
      }
    } catch (err) {
      console.error('Final fallback failed:', err);
    }
    
    return { data: null, success: false, needsRefresh: false };
  };

  // Background refresh for incomplete conversations
  useEffect(() => {
    if (conversationsNeedingRefresh.size === 0) return;

    const refreshIncompleteConversations = async () => {
      const conversationsToRefresh = Array.from(conversationsNeedingRefresh);
      
      for (const convId of conversationsToRefresh) {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) continue;

        const convPlatform = (conv as any).platform || platform;
        const table = convPlatform === 'facebook' 
          ? 'conversations' 
          : convPlatform === 'instagram' 
            ? 'instagram_conversations'
            : 'website_conversations';

        try {
          let query;
          if (convPlatform === 'facebook') {
            query = supabase
              .from('conversations')
              .select(`
                *,
                subscriber:subscribers(subscriber_name, subscriber_psid, profile_pic_url),
                facebook_pages(page_name),
                preferred_message_tag
              `)
              .eq('id', convId)
              .single();
          } else if (convPlatform === 'instagram') {
            query = supabase
              .from('instagram_conversations')
              .select(`
                *,
                subscriber:instagram_subscribers(subscriber_name, subscriber_instagram_id, profile_pic_url, subscriber_username),
                instagram_accounts(account_name)
              `)
              .eq('id', convId)
              .single();
          } else {
            query = supabase
              .from('website_conversations')
              .select(`
                *,
                visitor:website_visitors(visitor_name, visitor_email),
                website_widgets(widget_name, business_name)
              `)
              .eq('id', convId)
              .single();
          }

          const { data, error } = await query;

          if (data && !error && (
            (convPlatform === 'facebook' && data.subscriber) ||
            (convPlatform === 'instagram' && data.subscriber) ||
            (convPlatform === 'website' && data.visitor)
          )) {
            // Update the conversation with real data
            setConversations(prev => prev.map(c => {
              if (c.id === convId) {
                if (convPlatform === 'instagram') {
                  return {
                    ...data,
                    platform: 'instagram' as const,
                    subscriber: {
                      subscriber_name: data.subscriber?.subscriber_name || data.subscriber?.subscriber_username,
                      subscriber_psid: data.subscriber?.subscriber_instagram_id,
                      subscriber_instagram_id: data.subscriber?.subscriber_instagram_id,
                      subscriber_username: data.subscriber?.subscriber_username,
                      profile_pic_url: data.subscriber?.profile_pic_url
                    }
                  } as any;
                }
                return { ...data, platform: convPlatform } as any;
              }
              return c;
            }));

            // Remove from refresh list
            setConversationsNeedingRefresh(prev => {
              const newSet = new Set(prev);
              newSet.delete(convId);
              return newSet;
            });
          }
        } catch (err) {
          console.warn(`Failed to refresh conversation ${convId}:`, err);
        }
      }
    };

    // Refresh every 3 seconds
    const interval = setInterval(refreshIncompleteConversations, 3000);
    
    // Also run immediately
    refreshIncompleteConversations();

    return () => clearInterval(interval);
  }, [conversationsNeedingRefresh, conversations, platform]);

  // Setup realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    
    if (platform === 'all') {
      // Subscribe to both Facebook and Instagram when 'all' is selected
      const channel = supabase
        .channel('all-conversations')
        // Updates for existing Facebook conversations
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const updated = payload.new as any;
          setConversations(prev => {
            if (!prev || prev.length === 0) return prev;
            const updatedList = prev.map(conv => 
              conv.id === updated.id
                ? {
                    ...conv,
                    last_message_at: updated.last_message_at ?? (conv as any).last_message_at,
                    last_message_text: updated.last_message_text ?? (conv as any).last_message_text,
                    unread_count: typeof updated.unread_count === 'number' ? updated.unread_count : (conv as any).unread_count,
                    updated_at: updated.updated_at ?? (conv as any).updated_at,
                    preferred_message_tag: (updated as any).preferred_message_tag ?? (conv as any).preferred_message_tag,
                  }
                : conv
            );
            return [...updatedList].sort(
              (a, b) =>
                new Date((b as any).last_message_at).getTime() -
                new Date((a as any).last_message_at).getTime()
            );
          });
        })
        // Updates for existing Instagram conversations
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'instagram_conversations',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const updated = payload.new as any;
          setConversations(prev => {
            if (!prev || prev.length === 0) return prev;
            const updatedList = prev.map(conv => 
              conv.id === updated.id
                ? {
                    ...conv,
                    last_message_at: updated.last_message_at ?? (conv as any).last_message_at,
                    last_message_text: updated.last_message_text ?? (conv as any).last_message_text,
                    unread_count: typeof updated.unread_count === 'number' ? updated.unread_count : (conv as any).unread_count,
                    updated_at: updated.updated_at ?? (conv as any).updated_at,
                  }
                : conv
            );
            return [...updatedList].sort(
              (a, b) =>
                new Date((b as any).last_message_at).getTime() -
                new Date((a as any).last_message_at).getTime()
            );
          });
        })
        // New Facebook conversations (new contacts)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          try {
            const newConv = payload.new as any;
            
            const result = await fetchNewConversationWithRetry(
              newConv.id,
              'conversations',
              'facebook'
            );

            if (!result.data) {
              console.error('Failed to fetch new Facebook conversation after retries');
              return;
            }

            const convWithMeta = {
              ...result.data,
              platform: 'facebook' as const,
            };

            setConversations(prev => {
              const existing = prev?.some(c => c.id === convWithMeta.id);
              if (existing) return prev;
              return [convWithMeta as any, ...(prev || [])];
            });
          } catch (err) {
            console.error('Error loading new Facebook conversation:', err);
          }
        })
        // New Instagram conversations (new contacts)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'instagram_conversations',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          try {
            const newConv = payload.new as any;
            
            const result = await fetchNewConversationWithRetry(
              newConv.id,
              'instagram_conversations',
              'instagram'
            );

            if (!result.data) {
              console.error('Failed to fetch new Instagram conversation after retries');
              return;
            }

            const convWithMeta = {
              ...result.data,
              platform: 'instagram' as const,
              subscriber: {
                subscriber_name: result.data.subscriber?.subscriber_name || result.data.subscriber?.subscriber_username || 'Loading...',
                subscriber_psid: result.data.subscriber?.subscriber_instagram_id || '',
                subscriber_instagram_id: result.data.subscriber?.subscriber_instagram_id || '',
                subscriber_username: result.data.subscriber?.subscriber_username,
                profile_pic_url: result.data.subscriber?.profile_pic_url
              }
            };

            setConversations(prev => {
              const existing = prev?.some(c => c.id === convWithMeta.id);
              if (existing) return prev;
              return [convWithMeta as any, ...(prev || [])];
            });
          } catch (err) {
            console.error('Error loading new Instagram conversation:', err);
          }
        })
        // New messages for currently open conversations
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          const newMessage = payload.new as any;
          const currentConversation = selectedConversationRef.current;
          // If this message is for the currently selected conversation and sent by subscriber, add it instantly
          if (currentConversation && 
              newMessage.conversation_id === currentConversation.id && 
              newMessage.sender_type === 'subscriber') {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            
            // Show notification for new message
            const senderName = currentConversation.subscriber?.subscriber_name || 'Unknown User';
            showNotification(
              `New message from ${senderName}`,
              newMessage.message_text?.substring(0, 50) || 'New message received',
              currentConversation.subscriber?.profile_pic_url || undefined
            );
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'instagram_messages'
        }, (payload) => {
          const newMessage = payload.new as any;
          const currentConversation = selectedConversationRef.current;
          // If this message is for the currently selected conversation and sent by subscriber, add it instantly
          if (currentConversation && 
              newMessage.conversation_id === currentConversation.id && 
              newMessage.sender_type === 'subscriber') {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            
            // Show notification for new message
            const senderName = currentConversation.subscriber?.subscriber_name || 
                              currentConversation.subscriber?.subscriber_username || 
                              'Unknown User';
            showNotification(
              `New message from ${senderName}`,
              newMessage.message_text?.substring(0, 50) || 'New message received',
              currentConversation.subscriber?.profile_pic_url || undefined
            );
          }
        })
        // New website conversations (new visitors)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'website_conversations',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          try {
            const newConv = payload.new as any;
            
            const result = await fetchNewConversationWithRetry(
              newConv.id,
              'website_conversations',
              'website'
            );

            if (!result.data) {
              console.error('Failed to fetch new website conversation after retries');
              return;
            }

            const convWithMeta = {
              ...result.data,
              platform: 'website' as const,
            };

            setConversations(prev => {
              const existing = prev?.some(c => c.id === convWithMeta.id);
              if (existing) return prev;
              return [convWithMeta as any, ...(prev || [])];
            });
          } catch (err) {
            console.error('Error loading new website conversation:', err);
          }
        })
        // New website messages
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'website_messages'
        }, (payload) => {
          const newMessage = payload.new as any;
          // If this message is for the currently selected conversation and sent by visitor, add it instantly
          if (selectedConversation && 
              newMessage.conversation_id === selectedConversation.id && 
              newMessage.sender_type === 'visitor' &&
              (selectedConversation as any)?.platform === 'website') {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Specific platform behavior: Facebook, Instagram, or Website
      const conversationsTable = platform === 'facebook' 
        ? 'conversations' 
        : platform === 'instagram' 
          ? 'instagram_conversations'
          : 'website_conversations';
      
      const messagesTable = platform === 'facebook' 
        ? 'messages' 
        : platform === 'instagram' 
          ? 'instagram_messages'
          : 'website_messages';
      
      console.log('[LiveChat] Setting up', platform, 'subscription - messagesTable:', messagesTable);
      console.log('[LiveChat] Selected conversation on setup:', selectedConversation?.id);
      
      const channel = supabase
        .channel(`${platform}-conversations`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: conversationsTable,
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const updated = payload.new as any;
          setConversations(prev => {
            if (!prev || prev.length === 0) return prev;
            const updatedList = prev.map(conv => 
              conv.id === updated.id
                ? {
                    ...conv,
                    last_message_at: updated.last_message_at ?? (conv as any).last_message_at,
                    last_message_text: updated.last_message_text ?? (conv as any).last_message_text,
                    unread_count: typeof updated.unread_count === 'number' ? updated.unread_count : (conv as any).unread_count,
                    updated_at: updated.updated_at ?? (conv as any).updated_at,
                    preferred_message_tag: (updated as any).preferred_message_tag ?? (conv as any).preferred_message_tag,
                  }
                : conv
            );
            return [...updatedList].sort(
              (a, b) =>
                new Date((b as any).last_message_at).getTime() -
                new Date((a as any).last_message_at).getTime()
            );
          });
        })
        // New conversations for the current platform only
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: conversationsTable,
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          try {
            const newConv = payload.new as any;

            if (platform === 'facebook') {
              const result = await fetchNewConversationWithRetry(
                newConv.id,
                'conversations',
                'facebook'
              );

              if (!result.data) {
                console.error('Failed to fetch new Facebook conversation after retries');
                return;
              }

              const convWithMeta = {
                ...result.data,
                platform: 'facebook' as const,
              };

              setConversations(prev => {
                const existing = prev?.some(c => c.id === convWithMeta.id);
                if (existing) return prev;
                return [convWithMeta as any, ...(prev || [])];
              });
            } else if (platform === 'instagram') {
              const result = await fetchNewConversationWithRetry(
                newConv.id,
                'instagram_conversations',
                'instagram'
              );

              if (!result.data) {
                console.error('Failed to fetch new Instagram conversation after retries');
                return;
              }

              const convWithMeta = {
                ...result.data,
                platform: 'instagram' as const,
                subscriber: {
                  subscriber_name: result.data.subscriber?.subscriber_name || result.data.subscriber?.subscriber_username || 'Loading...',
                  subscriber_psid: result.data.subscriber?.subscriber_instagram_id || '',
                  subscriber_instagram_id: result.data.subscriber?.subscriber_instagram_id || '',
                  subscriber_username: result.data.subscriber?.subscriber_username,
                  profile_pic_url: result.data.subscriber?.profile_pic_url
                }
              };

              setConversations(prev => {
                const existing = prev?.some(c => c.id === convWithMeta.id);
                if (existing) return prev;
                return [convWithMeta as any, ...(prev || [])];
              });
            } else if (platform === 'website') {
              const result = await fetchNewConversationWithRetry(
                newConv.id,
                'website_conversations',
                'website'
              );

              if (!result.data) {
                console.error('Failed to fetch new website conversation after retries');
                return;
              }

              const convWithMeta = {
                ...result.data,
                platform: 'website' as const,
                visitor: result.data.visitor,
                website_widgets: result.data.website_widgets
              };

              setConversations(prev => {
                const existing = prev?.some(c => c.id === convWithMeta.id);
                if (existing) return prev;
                return [convWithMeta as any, ...(prev || [])];
              });
            }
          } catch (err) {
            console.error('Error loading new conversation:', err);
          }
        })
        // New messages for currently open conversation
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: messagesTable
        }, async (payload) => {
          console.log('[LiveChat] New message received on', platform, 'tab:', payload.new);
          const newMessage = payload.new as any;
          const currentConversation = selectedConversationRef.current;
          
          console.log('[LiveChat] Current conversation:', currentConversation?.id, 'Message conversation:', newMessage.conversation_id);
          console.log('[LiveChat] Sender type:', newMessage.sender_type);
          
          // If this message is for the currently selected conversation and sent by subscriber/visitor, add it instantly
          if (currentConversation && 
              newMessage.conversation_id === currentConversation.id && 
              (newMessage.sender_type === 'subscriber' || newMessage.sender_type === 'visitor')) {
            console.log('[LiveChat] Adding message to UI immediately');
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                console.log('[LiveChat] Message already exists, skipping');
                return prev;
              }
              console.log('[LiveChat] Message added successfully');
              return [...prev, newMessage];
            });
            
            // Phase 1: Show notification for new message
            const senderName = platform === 'website'
              ? (currentConversation.visitor?.visitor_name || 'Website Visitor')
              : (currentConversation.subscriber?.subscriber_name || 
                 currentConversation.subscriber?.subscriber_username || 
                 'Unknown User');
            
            showNotification(
              `New message from ${senderName}`,
              newMessage.message_text?.substring(0, 50) || 'New message received',
              currentConversation.subscriber?.profile_pic_url || undefined
            );

            // For Instagram tab, force a lightweight reload to stay perfectly in sync
            if (platform === 'instagram') {
              try {
                await loadMessages(currentConversation.id);
              } catch (e) {
                console.warn('[LiveChat] Failed to reload messages after realtime update:', e);
              }
            }
          } else {
            console.log('[LiveChat] Message not added - conditions not met');
            console.log('[LiveChat] Has conversation:', !!currentConversation);
            console.log('[LiveChat] IDs match:', currentConversation?.id === newMessage.conversation_id);
            console.log('[LiveChat] Sender type check:', newMessage.sender_type === 'subscriber' || newMessage.sender_type === 'visitor');
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, platform, connectedPages, instagramAccounts]);
  
  // Update ref whenever selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  const loadUserPreferences = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('default_message_tag').eq('id', user?.id).single();
      if (error) throw error;
      if (data?.default_message_tag) {
        setDefaultMessageTag(data.default_message_tag);
        setSelectedMessageTag(data.default_message_tag);
      }
    } catch (error: any) {
      console.error('Error loading user preferences:', error);
    }
  };
  const loadConnectedPages = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("facebook_pages").select("id, page_name, page_id, page_logo_url, page_access_token").eq("user_id", user?.id).eq("status", "active");
      if (error) throw error;
      setConnectedPages(data || []);
    } catch (error: any) {
      console.error("Error loading pages:", error);
    }
  };
  const loadInstagramAccounts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("instagram_accounts").select("id, account_name, instagram_username, profile_picture_url, access_token").eq("user_id", user?.id).eq("status", "active");
      if (error) throw error;
      setInstagramAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading Instagram accounts:", error);
    }
  };
  const loadConversations = async () => {
    setLoading(true);
    try {
      if (platform === 'all') {
        // Fetch Facebook, Instagram, and Website conversations
        const [fbResult, igResult, webResult] = await Promise.all([
          supabase.from('conversations').select(`
            *,
            subscriber:subscribers(subscriber_name, subscriber_psid, profile_pic_url),
            preferred_message_tag
          `).eq('user_id', user?.id).order('last_message_at', { ascending: false }),
          supabase.from('instagram_conversations').select(`
            *,
            subscriber:instagram_subscribers(subscriber_name, subscriber_instagram_id, profile_pic_url, subscriber_username)
          `).eq('user_id', user?.id).order('last_message_at', { ascending: false }),
          supabase.from('website_conversations').select(`
            *,
            visitor:website_visitors(visitor_name, visitor_email),
            website_widgets(widget_name, business_name)
          `).eq('user_id', user?.id).order('last_message_at', { ascending: false })
        ]);

        if (fbResult.error) throw fbResult.error;
        if (igResult.error) throw igResult.error;
        if (webResult.error) throw webResult.error;

        const fbConversations = (fbResult.data || []).map(conv => {
          const page = connectedPages.find(p => p.id === conv.page_id);
          return {
            ...conv,
            platform: 'facebook' as const,
            facebook_pages: page ? { page_name: page.page_name } : null
          };
        });

        const igConversations = (igResult.data || []).map(conv => {
          const account = instagramAccounts.find(a => a.id === conv.instagram_account_id);
          return {
            ...conv,
            platform: 'instagram' as const,
            subscriber: {
              subscriber_name: conv.subscriber?.subscriber_name || conv.subscriber?.subscriber_username,
              subscriber_psid: conv.subscriber?.subscriber_instagram_id,
              subscriber_instagram_id: conv.subscriber?.subscriber_instagram_id,
              subscriber_username: conv.subscriber?.subscriber_username,
              profile_pic_url: conv.subscriber?.profile_pic_url
            },
            instagram_accounts: account ? { account_name: account.account_name } : null
          };
        });

        const webConversations = (webResult.data || []).map(conv => ({
          ...conv,
          platform: 'website' as const,
          visitor: conv.visitor,
          website_widgets: conv.website_widgets
        }));

        // Combine and sort by last_message_at
        const allConversations = [...fbConversations, ...igConversations, ...webConversations].sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );

        setConversations(allConversations as any);
      } else if (platform === 'website') {
        const { data, error } = await supabase
          .from('website_conversations')
          .select(`
            *,
            visitor:website_visitors(visitor_name, visitor_email),
            website_widgets(widget_name, business_name)
          `)
          .eq('user_id', user?.id)
          .order('last_message_at', { ascending: false });

        if (error) throw error;

        const conversationsWithMeta = (data || []).map(conv => ({
          ...conv,
          platform: 'website' as const,
          visitor: conv.visitor,
          website_widgets: conv.website_widgets
        }));

        setConversations(conversationsWithMeta as any);
      } else if (platform === 'facebook') {
        let query = supabase.from('conversations').select(`
            *,
            subscriber:subscribers(subscriber_name, subscriber_psid, profile_pic_url),
            preferred_message_tag
          `).eq('user_id', user?.id);
        if (selectedPageId !== "all") {
          query = query.eq("page_id", selectedPageId);
        }
        const {
          data,
          error
        } = await query.order('last_message_at', {
          ascending: false
        });
        if (error) throw error;
        const conversationsWithPages = (data || []).map(conv => {
          const page = connectedPages.find(p => p.id === conv.page_id);
          return {
            ...conv,
            platform: 'facebook' as const,
            facebook_pages: page ? {
              page_name: page.page_name
            } : null
          };
        });
        setConversations(conversationsWithPages as any);
      } else {
        let query = supabase.from('instagram_conversations').select(`
            *,
            subscriber:instagram_subscribers(subscriber_name, subscriber_instagram_id, profile_pic_url, subscriber_username)
          `).eq('user_id', user?.id);
        if (selectedPageId !== "all") {
          query = query.eq("instagram_account_id", selectedPageId);
        }
        const {
          data,
          error
        } = await query.order('last_message_at', {
          ascending: false
        });
        if (error) throw error;
        const conversationsWithAccounts = (data || []).map(conv => {
          const account = instagramAccounts.find(a => a.id === conv.instagram_account_id);
          return {
            ...conv,
            platform: 'instagram' as const,
            subscriber: {
              subscriber_name: conv.subscriber?.subscriber_name || conv.subscriber?.subscriber_username,
              subscriber_psid: conv.subscriber?.subscriber_instagram_id,
              subscriber_instagram_id: conv.subscriber?.subscriber_instagram_id,
              subscriber_username: conv.subscriber?.subscriber_username,
              profile_pic_url: conv.subscriber?.profile_pic_url
            },
            instagram_accounts: account ? {
              account_name: account.account_name
            } : null
          };
        });
        setConversations(conversationsWithAccounts as any);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleScanConversations = async () => {
    try {
      setScanning(true);
      abortControllerRef.current = new AbortController();

      const {
        data: sessionData
      } = await supabase.auth.getSession();
      let totalSubscribers = 0;
      let totalConversations = 0;
      let scannedCount = 0;

      // Scan based on selected platform tab
      if (platform === 'all' || platform === 'facebook') {
        // Get enabled Facebook pages based on filter
        let fbQuery = supabase
          .from('facebook_pages')
          .select('id, page_name')
          .eq('user_id', user?.id)
          .eq('status', 'active'); // Only scan enabled pages

        // If a specific page is selected, only scan that page
        if (selectedPageId !== "all" && platform === 'facebook') {
          fbQuery = fbQuery.eq('id', selectedPageId);
        }

        const { data: pages, error: pagesError } = await fbQuery;
        
        if (pages && pages.length > 0) {
          // Scan each Facebook page
          for (const page of pages) {
            const { data, error } = await supabase.functions.invoke('scan-subscribers', {
              body: {
                pageId: page.id
              },
              headers: {
                Authorization: `Bearer ${sessionData.session?.access_token}`
              }
            });
            
            if (error) {
              console.error(`Error scanning page ${page.page_name}:`, error);
              toast({
                title: `Failed to scan ${page.page_name}`,
                description: error.message || 'Failed to scan page',
                variant: 'destructive'
              });
              continue;
            }
            
            totalSubscribers += data.subscribersCount || 0;
            totalConversations += data.conversationsCount || 0;
            scannedCount++;
          }
        }
      }

      if (platform === 'all' || platform === 'instagram') {
        // Get enabled Instagram accounts based on filter
        let igQuery = supabase
          .from('instagram_accounts')
          .select('id, account_name, instagram_username')
          .eq('user_id', user?.id)
          .eq('status', 'active'); // Only scan enabled accounts

        // If a specific account is selected, only scan that account
        if (selectedPageId !== "all" && platform === 'instagram') {
          igQuery = igQuery.eq('id', selectedPageId);
        }

        const { data: accounts, error: accountsError } = await igQuery;
        
        if (accounts && accounts.length > 0) {
          // Scan each Instagram account
          for (const account of accounts) {
            const { data, error } = await supabase.functions.invoke('scan-subscribers', {
              body: {
                instagramAccountId: account.id,
                platform: 'instagram'
              },
              headers: {
                Authorization: `Bearer ${sessionData.session?.access_token}`
              }
            });
            
            if (error) {
              console.error(`Error scanning account @${account.instagram_username}:`, error);
              toast({
                title: `Failed to scan @${account.instagram_username}`,
                description: error.message || 'Failed to scan account',
                variant: 'destructive'
              });
              continue;
            }
            
            totalSubscribers += data.subscribersCount || 0;
            totalConversations += data.conversationsCount || 0;
            scannedCount++;
          }
        }
      }

      if (scannedCount === 0) {
        toast({
          title: 'No accounts to scan',
          description: platform === 'all' 
            ? 'Please connect and enable at least one Facebook page or Instagram account'
            : `Please connect and enable at least one ${platform} ${platform === 'facebook' ? 'page' : 'account'}`,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Scan Complete',
        description: scannedCount > 1 
          ? `Scanned ${scannedCount} ${platform === 'all' ? 'accounts' : platform === 'facebook' ? 'pages' : 'accounts'}: Found ${totalSubscribers} subscribers and created ${totalConversations} conversations`
          : `Found ${totalSubscribers} subscribers and created ${totalConversations} conversations`,
        duration: 5000
      });
      
      await loadConversations();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Scan Canceled',
          description: 'Subscriber scan was canceled'
        });
      } else {
        console.error('Error scanning conversations:', error);
        toast({
          title: 'Scan Failed',
          description: error.message || 'Failed to scan conversations',
          variant: 'destructive'
        });
      }
    } finally {
      setScanning(false);
      abortControllerRef.current = null;
    }
  };
  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  const loadMessageHistory = async () => {
    if (!selectedConversation || loadingHistory) return;
    setLoadingHistory(true);
    try {
      // Determine the actual platform from conversation when in 'all' mode
      const currentPlatform = platform === 'all' 
        ? (selectedConversation as any)?.platform || 'facebook'
        : platform;
      const pageIdField = currentPlatform === 'instagram' ? 'instagram_account_id' : 'page_id';
      const pageId = currentPlatform === 'instagram' ? (selectedConversation as any).instagram_account_id : selectedConversation.page_id;
      const {
        data,
        error
      } = await supabase.functions.invoke('fetch-message-history', {
        body: {
          conversationId: selectedConversation.id,
          subscriberPsid: selectedConversation.subscriber.subscriber_psid,
          pageId: pageId,
          platform: currentPlatform
        }
      });
      if (error) throw error;
      toast({
        title: 'History Loaded',
        description: `Loaded ${data.messagesCount} historical messages`
      });

      // Reload messages to show the new history
      await loadMessages(selectedConversation.id);
    } catch (error: any) {
      console.error('Error loading message history:', error);
      toast({
        title: 'Failed to Load History',
        description: error.message || 'Could not fetch message history',
        variant: 'destructive'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Detect scroll to top for loading history
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => {
      const {
        scrollTop
      } = scrollContainer;

      // If scrolled to within 50px of top, load history
      if (scrollTop < 50 && !loadingHistory && selectedConversation) {
        loadMessageHistory();
      }
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [selectedConversation, loadingHistory]);
  const loadMessages = async (conversationId: string) => {
    // Don't show loading state to prevent "refresh" feeling
    try {
      // Determine table based on platform or conversation's platform property
      const currentPlatform = platform === 'all' 
        ? (selectedConversation as any)?.platform || 'facebook'
        : platform;
      
      const tableName = currentPlatform === 'facebook' 
        ? 'messages' 
        : currentPlatform === 'instagram' 
          ? 'instagram_messages'
          : 'website_messages';
      
      const {
        data,
        error
      } = await supabase.from(tableName).select('*').eq('conversation_id', conversationId).order('sent_at', {
        ascending: true
      });
      if (error) throw error;
      // Update messages immediately and normalize sender_type for UI
      if (data) {
        const normalized = (data as any[]).map(msg => ({
          ...msg,
          sender_type: (msg.sender_type === 'page' || msg.sender_type === 'agent') ? 'user' : msg.sender_type,
        }));
        setMessages(normalized as any);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  const markAsRead = async (conversationId: string) => {
    try {
      // Determine table based on platform or conversation's platform property
      const currentPlatform = platform === 'all' 
        ? (selectedConversation as any)?.platform || 'facebook'
        : platform;
      
      const tableName = currentPlatform === 'facebook' 
        ? 'conversations' 
        : currentPlatform === 'instagram' 
          ? 'instagram_conversations'
          : 'website_conversations';
      
      await supabase.from(tableName).update({
        unread_count: 0
      }).eq('id', conversationId);
      setConversations(prev => prev.map(conv => conv.id === conversationId ? {
        ...conv,
        unread_count: 0
      } : conv));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };
  const sendMessage = async (messageTag?: string) => {
    if (!newMessage.trim() && !selectedFile || !selectedConversation) return;
    
    // Create optimistic message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_type: 'user' as const,
      message_text: newMessage,
      sent_at: new Date().toISOString(),
      status: 'sending' as const,
      attachment_url: previewUrl,
      attachment_type: selectedFile?.type || null,
      facebook_message_id: null,
      instagram_message_id: null,
      created_at: new Date().toISOString()
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, optimisticMessage as any]);
    
    // Clear input and file immediately
    const messageText = newMessage;
    const file = selectedFile;
    const filePreview = previewUrl;
    setNewMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);
    
    try {
      let attachmentUrl = null;
      let attachmentType = null;

      // Upload file if selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('chat-attachments').upload(fileName, file);
        if (uploadError) throw uploadError;
        const {
          data: urlData
        } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
        attachmentUrl = urlData.publicUrl;
        attachmentType = file.type;
      }
      
      const conversationPlatform = platform === 'all' 
        ? (selectedConversation as any)?.platform 
        : platform;

      if (conversationPlatform === 'facebook') {
        // Facebook Messenger
        const {
          data: conversation
        } = await supabase.from('conversations').select('page_id, subscriber_id').eq('id', selectedConversation.id).single();
        if (!conversation) throw new Error('Conversation not found');
        const {
          data: subscriber
        } = await supabase.from('subscribers').select('subscriber_psid').eq('id', conversation.subscriber_id).single();
        if (!subscriber) throw new Error('Subscriber not found');
        const {
          data: page
        } = await supabase.from('facebook_pages').select('*').eq('id', conversation.page_id).single();
        if (!page) throw new Error('Page not found');
        const {
          data,
          error
        } = await supabase.functions.invoke('send-message', {
          body: {
            pageAccessToken: page.page_access_token,
            recipientPsid: subscriber.subscriber_psid,
            messageText,
            conversationId: selectedConversation.id,
            attachmentUrl,
            attachmentType,
            messageTag
          }
        });
        if (error) throw error;
      } else if (conversationPlatform === 'instagram') {
        // Instagram DM
        const {
          data: conversation,
          error: convError
        } = await supabase
          .from('instagram_conversations')
          .select('instagram_account_id, subscriber_id')
          .eq('id', selectedConversation.id)
          .maybeSingle();
        
        console.log('[LiveChat] Instagram conversation lookup:', {
          conversationId: selectedConversation.id,
          found: !!conversation,
          data: conversation,
          error: convError
        });
        
        if (convError) {
          console.error('[LiveChat] Error fetching conversation:', convError);
          throw new Error(`Failed to fetch conversation: ${convError.message}`);
        }
        
        if (!conversation) {
          console.error('[LiveChat] No conversation found with ID:', selectedConversation.id);
          throw new Error('Instagram conversation not found. Please refresh and try again.');
        }
        
        if (!conversation.instagram_account_id) {
          console.error('[LiveChat] Missing instagram_account_id in conversation:', conversation);
          throw new Error('Instagram account ID is missing. Please reconnect your Instagram account.');
        }
        
        const {
          data: subscriber,
          error: subError
        } = await supabase
          .from('instagram_subscribers')
          .select('subscriber_instagram_id')
          .eq('id', conversation.subscriber_id)
          .maybeSingle();
        
        console.log('[LiveChat] Instagram subscriber lookup:', {
          subscriberId: conversation.subscriber_id,
          found: !!subscriber,
          data: subscriber,
          error: subError
        });
        
        if (subError) {
          console.error('[LiveChat] Error fetching subscriber:', subError);
          throw new Error(`Failed to fetch subscriber: ${subError.message}`);
        }
        
        if (!subscriber) {
          console.error('[LiveChat] No subscriber found with ID:', conversation.subscriber_id);
          throw new Error('Instagram subscriber not found. Please refresh and try again.');
        }
        
        if (!subscriber.subscriber_instagram_id) {
          console.error('[LiveChat] Missing subscriber_instagram_id:', subscriber);
          throw new Error('Instagram subscriber ID is missing. The subscriber data may be incomplete.');
        }
        
        console.log('[LiveChat] Sending Instagram message with payload:', {
          recipientId: subscriber.subscriber_instagram_id,
          accountId: conversation.instagram_account_id,
          conversationId: selectedConversation.id,
          hasMessageText: !!messageText,
          hasAttachment: !!attachmentUrl
        });
        
        const {
          data,
          error
        } = await supabase.functions.invoke('instagram-send-message', {
          body: {
            recipientId: subscriber.subscriber_instagram_id,
            messageText,
            conversationId: selectedConversation.id,
            accountId: conversation.instagram_account_id,
            attachment: attachmentUrl ? {
              type: attachmentType?.startsWith('image/') ? 'image' : 'file',
              url: attachmentUrl
            } : null
          }
        });
        
        if (error) {
          console.error('[LiveChat] Edge function error:', error);
          throw error;
        }
        
        console.log('[LiveChat] Message sent successfully:', data);
      } else if (conversationPlatform === 'website') {
        // Website Chat
        const {
          data,
          error
        } = await supabase.functions.invoke('website-send-message', {
          body: {
            conversation_id: selectedConversation.id,
            message: messageText,
            attachment_url: attachmentUrl,
            attachment_type: attachmentType
          }
        });
        if (error) throw error;
        
        // Update optimistic message with real ID from response
        if (data?.message?.id) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? { ...msg, id: data.message.id, status: 'sent' } : msg
          ));
        }
      } else {
        // For Facebook/Instagram, just mark as sent
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        ));
      }
      
    } catch (error: any) {
      console.error('Send message error:', error);
      
      // Parse error message
      let errorMessage = error.message || 'Failed to send message';
      let errorCode = null;
      
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          errorMessage = errorBody.error || errorMessage;
          errorCode = errorBody.errorCode;
        } catch (e) {
          // If parsing fails, use the original error message
        }
      }
      
      // Provide user-friendly message for 24-hour window error
      if (errorCode === 'MESSAGING_WINDOW_EXPIRED') {
        errorMessage = '⏰ Cannot send message. Instagram/Facebook only allows messages within 24 hours of the customer\'s last message. Ask the customer to send a message first.';
      }
      
      // Update optimistic message to failed status with error
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed', error: errorMessage } as any : msg
      ));
      
      toast({
        title: 'Message Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000
      });
    }
  };
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const saveGlobalPreference = async (tag: string) => {
    setSavingPreference(true);
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        default_message_tag: tag
      }).eq('id', user?.id);
      if (error) throw error;
      setDefaultMessageTag(tag);
      toast({
        title: 'Preference saved',
        description: 'Your default message tag has been updated'
      });
    } catch (error: any) {
      console.error('Error saving preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preference',
        variant: 'destructive'
      });
    } finally {
      setSavingPreference(false);
    }
  };
  const saveConversationPreference = async (tag: string) => {
    if (!selectedConversation) return;
    setSavingPreference(true);
    try {
      const {
        error
      } = await supabase.from('conversations').update({
        preferred_message_tag: tag
      }).eq('id', selectedConversation.id);
      if (error) throw error;

      // Update local state
      setConversations(prev => prev.map(conv => conv.id === selectedConversation.id ? {
        ...conv,
        preferred_message_tag: tag
      } as any : conv));
      toast({
        title: 'Preference saved',
        description: 'Message tag preference saved for this conversation'
      });
    } catch (error: any) {
      console.error('Error saving conversation preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to save conversation preference',
        variant: 'destructive'
      });
    } finally {
      setSavingPreference(false);
    }
  };
  const loadProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      // First get user's store
      const {
        data: storeData,
        error: storeError
      } = await supabase.from('stores').select('id, currency, show_decimals').eq('user_id', user.id).single();
      if (storeError || !storeData) {
        console.log('No store found for user');
        return;
      }

      // Set store currency and decimal settings
      setStoreCurrency(storeData.currency || 'USD');
      setShowDecimals(storeData.show_decimals !== false);

      // Then fetch products
      const {
        data: productsData,
        error: productsError
      } = await supabase.from('products').select('id, name, price, image_url, description, store_id').eq('store_id', storeData.id).eq('is_active', true).order('name');
      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCannedMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('canned_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCannedMessages(data || []);
    } catch (error: any) {
      console.error('Error loading canned messages:', error);
    }
  };

  const saveCannedMessage = async () => {
    if (!newCannedMessage.name.trim() || !newCannedMessage.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both name and content',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('canned_messages')
        .insert({
          user_id: user?.id,
          name: newCannedMessage.name,
          content: newCannedMessage.content
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Canned message saved'
      });

      setNewCannedMessage({ name: '', content: '' });
      setShowAddCanned(false);
      loadCannedMessages();
    } catch (error: any) {
      console.error('Error saving canned message:', error);
      toast({
        title: 'Error',
        description: 'Failed to save canned message',
        variant: 'destructive'
      });
    }
  };

  const useCannedMessage = (content: string) => {
    setNewMessage(content);
    setShowCannedMessages(false);
  };

  const deleteCannedMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('canned_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Canned message deleted'
      });

      loadCannedMessages();
    } catch (error: any) {
      console.error('Error deleting canned message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete canned message',
        variant: 'destructive'
      });
    }
  };
  const sendProductCards = async () => {
    if (!selectedConversation || selectedProducts.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one product to send',
        variant: 'destructive'
      });
      return;
    }
    setSending(true);
    try {
      // Get user's store with slug
      const {
        data: stores,
        error: storeError
      } = await supabase.from('stores').select('slug').eq('user_id', user?.id).limit(1);
      if (storeError) throw storeError;
      const storeSlug = stores?.[0]?.slug || '';

      // Get selected products data
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));

      // Determine the actual platform for this conversation
      const conversationPlatform = platform === 'all' 
        ? (selectedConversation as any).platform 
        : platform;

      // Get subscriber or visitor info for auto-authentication
      const isWebsiteVisitor = !!(selectedConversation as any).visitor;
      const subscriberInfo = isWebsiteVisitor
        ? {
            id: selectedConversation.visitor_id || (selectedConversation as any).visitor.visitor_email || 'visitor',
            name: (selectedConversation as any).visitor.visitor_name || 'Website Visitor',
            profile_pic: ''
          }
        : {
            id: conversationPlatform === 'facebook'
              ? selectedConversation.subscriber?.subscriber_psid || ''
              : selectedConversation.subscriber?.subscriber_instagram_id || '',
            name: selectedConversation.subscriber?.subscriber_name || 'Customer',
            profile_pic: selectedConversation.subscriber?.profile_pic_url || ''
          };

      // Build auth params for auto-login
      const authParams = new URLSearchParams({
        sub_id: subscriberInfo.id,
        sub_name: subscriberInfo.name,
        sub_pic: subscriberInfo.profile_pic,
        platform: conversationPlatform
      }).toString();
      
      if (conversationPlatform === 'facebook') {
        const page = connectedPages.find(p => p.id === selectedConversation.page_id);
        if (!page) throw new Error('Page not found');
        const {
          data: pageData
        } = await supabase.from('facebook_pages').select('page_access_token').eq('id', page.id).single();
        const {
          error
        } = await supabase.functions.invoke('send-message', {
          body: {
            pageAccessToken: pageData?.page_access_token,
            recipientPsid: selectedConversation.subscriber.subscriber_psid,
            conversationId: selectedConversation.id,
            productCards: selectedProductsData.map(p => ({
              title: p.name,
              image_url: p.image_url,
              subtitle: `${formatPrice(p.price, storeCurrency, showDecimals)}${p.description ? ' - ' + p.description : ''}`,
              default_action: {
                type: 'web_url',
                url: `${window.location.origin}/store/${storeSlug}/product/${p.id}?${authParams}`
              },
              buttons: [{
                type: 'web_url',
                url: `${window.location.origin}/store/${storeSlug}/product/${p.id}?${authParams}`,
                title: 'Order Now'
              }]
            })),
            messageTag: selectedMessageTag !== 'HUMAN_AGENT' ? selectedMessageTag : undefined
          }
        });
        if (error) throw error;
      } else {
        const account = instagramAccounts.find(a => a.id === (selectedConversation as any).instagram_account_id);
        if (!account) throw new Error('Instagram account not found');
        const {
          error
        } = await supabase.functions.invoke('instagram-send-message', {
          body: {
            recipientId: selectedConversation.subscriber.subscriber_instagram_id,
            conversationId: selectedConversation.id,
            accountId: account.id,
            productCards: selectedProductsData.map(p => ({
              title: p.name,
              image_url: p.image_url,
              subtitle: `${formatPrice(p.price, storeCurrency, showDecimals)}${p.description ? ' - ' + p.description : ''}`,
              default_action: {
                type: 'web_url',
                url: `${window.location.origin}/store/${storeSlug}/product/${p.id}?${authParams}`
              },
              buttons: [{
                type: 'web_url',
                url: `${window.location.origin}/store/${storeSlug}/product/${p.id}?${authParams}`,
                title: 'Order Now'
              }]
            }))
          }
        });
        if (error) throw error;
      }
      toast({
        title: 'Success',
        description: `Sent ${selectedProducts.length} product card(s)`
      });
      setSelectedProducts([]);
      loadMessages(selectedConversation.id);
    } catch (error: any) {
      console.error('Error sending products:', error);
      
      // Parse error message if it's a function error
      let errorMessage = error.message || 'Failed to send product cards';
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          errorMessage = errorBody.error || errorMessage;
        } catch (e) {
          // If parsing fails, use the original error message
        }
      }
      
      toast({
        title: 'Failed to Send Products',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setSending(false);
    }
  };
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };
  const filteredConversations = conversations.filter(conv => {
    const search = searchQuery.trim().toLowerCase();
    const displayName = (conv as any).visitor?.visitor_name
      || conv.subscriber?.subscriber_name
      || conv.subscriber?.subscriber_username
      || '';
    const matchesSearch = search === ''
      || displayName.toLowerCase().includes(search)
      || conv.last_message_text?.toLowerCase().includes(search);
    const matchesFilter = filterType === 'all' || (filterType === 'unread' && conv.unread_count > 0);
    return matchesSearch && matchesFilter;
  });
  if (loading) {
    return <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const filteredProducts = products.filter(p => productSearchQuery.trim() === '' || p.name.toLowerCase().includes(productSearchQuery.toLowerCase()));
  
  return (
    <>
      <div className="grid grid-cols-[280px_1fr] gap-4 h-screen">
      {/* Conversations List */}
      <Card className="flex flex-col overflow-hidden w-[280px]">
        <CardHeader className="flex-shrink-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
            <Button onClick={handleScanConversations} disabled={scanning} size="sm" variant="outline" className="h-8">
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scan className="h-3 w-3" />}
            </Button>
          </div>
          <div className="space-y-2">
            <Tabs value={platform} onValueChange={value => {
            setPlatform(value as 'facebook' | 'instagram' | 'website' | 'all');
            setSelectedPageId('all');
            setSelectedConversation(null);
          }}>
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="facebook" className="flex items-center gap-1.5 text-xs">
                  <Facebook className="h-3.5 w-3.5" />
                  FB
                </TabsTrigger>
                <TabsTrigger value="instagram" className="flex items-center gap-1.5 text-xs">
                  <Instagram className="h-3.5 w-3.5" />
                  IG
                </TabsTrigger>
                <TabsTrigger value="website" className="flex items-center gap-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Web
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {platform === 'facebook' && connectedPages.length > 1 && <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  {connectedPages.map(page => <SelectItem key={page.id} value={page.id}>
                      {page.page_name}
                    </SelectItem>)}
                </SelectContent>
              </Select>}
            
            {platform === 'instagram' && instagramAccounts.length > 1 && <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {instagramAccounts.map(account => <SelectItem key={account.id} value={account.id}>
                      @{account.instagram_username}
                    </SelectItem>)}
                </SelectContent>
              </Select>}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 h-8 text-xs" />
            </div>
            <div className="flex gap-1.5">
              <Badge variant={filterType === 'all' ? 'default' : 'outline'} className="cursor-pointer text-xs px-2 py-0.5" onClick={() => setFilterType('all')}>
                All
              </Badge>
              <Badge variant={filterType === 'unread' ? 'default' : 'outline'} className="cursor-pointer text-xs px-2 py-0.5" onClick={() => setFilterType('unread')}>
                Unread ({conversations.filter(c => c.unread_count > 0).length})
              </Badge>
            </div>
          </div>
        </CardHeader>
        {scanning && <div className="px-6 py-3 bg-primary/10 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">Scanning conversations...</span>
                <span className="text-xs text-muted-foreground">
                  {Math.floor(scanDuration / 60)}:{(scanDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelScan} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>}
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? <div className="p-4 text-center text-muted-foreground">
                {searchQuery || filterType === 'unread' ? 'No conversations found' : 'No conversations yet'}
              </div> : <div className="divide-y divide-border">
                {filteredConversations.map(conversation => <ContextMenu key={conversation.id}>
                    <ContextMenuTrigger asChild>
                      <div onClick={() => setSelectedConversation(conversation)} className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-muted' : conversation.unread_count > 0 ? 'bg-red-500/10' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={
                          (conversation as any).visitor 
                            ? undefined 
                            : conversation.subscriber?.profile_pic_url || undefined
                        } />
                        <AvatarFallback className="text-sm">
                          {(conversation as any).visitor 
                            ? ((conversation as any).visitor.visitor_name?.[0]?.toUpperCase() || 'V')
                            : (conversation.subscriber?.subscriber_name?.[0]?.toUpperCase() || conversation.subscriber?.subscriber_username?.[0]?.toUpperCase() || 'U')
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="font-medium text-sm line-clamp-2">
                            {(conversation as any).visitor 
                              ? ((conversation as any).visitor.visitor_name || 'Anonymous Visitor')
                              : (conversation.subscriber?.subscriber_name || conversation.subscriber?.subscriber_username || 'Unknown User')
                            }
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedPageId === "all" && <>
                                {platform === 'all' ? <>
                                    {/* Show platform indicator for all conversations */}
                                    {(conversation as any).platform === 'facebook' && conversation.facebook_pages?.page_name && <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Facebook className="h-3 w-3 text-facebook" />
                                              {connectedPages.find(p => p.id === conversation.page_id)?.page_logo_url ? <img src={connectedPages.find(p => p.id === conversation.page_id)?.page_logo_url || undefined} alt={conversation.facebook_pages.page_name} className="w-4 h-4 rounded-full object-cover" /> : <div className={`${getPageColor(conversation.page_id)} text-primary-foreground text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center`}>
                                                  {conversation.facebook_pages.page_name[0].toUpperCase()}
                                                </div>}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            <p>{conversation.facebook_pages.page_name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>}
                                    {(conversation as any).platform === 'instagram' && (conversation as any).instagram_accounts?.account_name && <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Instagram className="h-3 w-3 text-instagram" />
                                              <div className={`${getPageColor((conversation as any).instagram_account_id)} text-primary-foreground text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center`}>
                                                {(conversation as any).instagram_accounts.account_name[0].toUpperCase()}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            <p>{(conversation as any).instagram_accounts.account_name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>}
                                    {(conversation as any).platform === 'website' && (conversation as any).website_widgets?.widget_name && <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Globe className="h-3 w-3 text-primary" />
                                              <div className="bg-primary text-primary-foreground text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                                                {(conversation as any).website_widgets.widget_name[0].toUpperCase()}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            <p>{(conversation as any).website_widgets.widget_name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>}
                                  </> : platform === 'facebook' ? <>
                                    {conversation.facebook_pages?.page_name && <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Facebook className="h-3 w-3 text-facebook" />
                                              {connectedPages.find(p => p.id === conversation.page_id)?.page_logo_url ? <img src={connectedPages.find(p => p.id === conversation.page_id)?.page_logo_url || undefined} alt={conversation.facebook_pages.page_name} className="w-4 h-4 rounded-full object-cover" /> : <div className={`${getPageColor(conversation.page_id)} text-primary-foreground text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center`}>
                                                  {conversation.facebook_pages.page_name[0].toUpperCase()}
                                                </div>}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            <p>{conversation.facebook_pages.page_name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>}
                                  </> : <>
                                    {(conversation as any).instagram_accounts?.account_name && <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Instagram className="h-3 w-3 text-instagram" />
                                              <div className={`${getPageColor((conversation as any).instagram_account_id)} text-primary-foreground text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center`}>
                                                {(conversation as any).instagram_accounts.account_name[0].toUpperCase()}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">
                                            <p>{(conversation as any).instagram_accounts.account_name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>}
                                  </>}
                              </>}
                            {conversation.unread_count > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium min-w-[20px] text-center">
                                {conversation.unread_count}
                              </span>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {(conversation.last_message_text || 'No messages').slice(0, 40)}{(conversation.last_message_text?.length || 0) > 40 ? '...' : ''}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true
                      })}
                          </p>
                           {!isWithin24HourWindow(conversation.last_message_at) && 
                           ((platform === 'all' && (conversation as any)?.platform === 'facebook') || platform === 'facebook') && 
                           <span className="text-[10px] text-warning font-medium shrink-0">
                              Expired
                            </span>}
                        </div>
                       </div>
                     </div>
                   </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem onSelect={() => {
                        if (selectedConversation?.id === conversation.id) return;
                        setSelectedConversation(conversation);
                      }}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Open Conversation
                      </ContextMenuItem>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <Tag className="mr-2 h-4 w-4" />
                          Assign Label
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48">
                          {labels.length === 0 ? (
                            <ContextMenuItem disabled>No labels created</ContextMenuItem>
                          ) : (
                            labels.map(label => (
                              <ContextMenuItem
                                key={label.id}
                                onSelect={() => assignLabel(
                                  conversation.id,
                                  label.id,
                                  platform === 'all' ? (conversation as any).platform : platform
                                )}
                              >
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: label.color }}
                                />
                                {label.name}
                              </ContextMenuItem>
                            ))
                          )}
                          <ContextMenuSeparator />
                          <ContextMenuItem onSelect={() => setShowLabelDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Label
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => markAsRead(conversation.id)}>
                        Mark as Read
                      </ContextMenuItem>
                      <ContextMenuItem className="text-destructive" onSelect={() => {
                        toast({ title: "Archive feature coming soon" });
                      }}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>)}
              </div>}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Thread and Product Panel */}
      {selectedConversation ? <div className="h-full flex gap-4 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={
                    (selectedConversation as any).visitor 
                      ? undefined 
                      : selectedConversation.subscriber?.profile_pic_url || undefined
                  } />
                  <AvatarFallback>
                    {(selectedConversation as any).visitor
                      ? ((selectedConversation as any).visitor.visitor_name?.[0]?.toUpperCase() || 'V')
                      : (selectedConversation.subscriber?.subscriber_name?.[0]?.toUpperCase() || selectedConversation.subscriber?.subscriber_username?.[0]?.toUpperCase() || 'U')
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {(selectedConversation as any).visitor
                        ? ((selectedConversation as any).visitor.visitor_name || 'Anonymous Visitor')
                        : (selectedConversation.subscriber?.subscriber_name || selectedConversation.subscriber?.subscriber_username || 'Unknown User')
                      }
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {/* Platform Icon */}
                      {platform === 'all' ? (
                        (selectedConversation as any)?.platform === 'facebook' ? (
                          <Facebook className="h-4 w-4 text-facebook" />
                        ) : (selectedConversation as any)?.platform === 'instagram' ? (
                          <Instagram className="h-4 w-4 text-instagram" />
                        ) : (
                          <Globe className="h-4 w-4 text-primary" />
                        )
                      ) : platform === 'facebook' ? (
                        <Facebook className="h-4 w-4 text-facebook" />
                      ) : platform === 'instagram' ? (
                        <Instagram className="h-4 w-4 text-instagram" />
                      ) : (
                        <Globe className="h-4 w-4 text-primary" />
                      )}
                      
                      {/* Page Icon */}
                      {platform === 'all' && (selectedConversation as any)?.platform === 'facebook' && selectedConversation.facebook_pages?.page_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {connectedPages.find(p => p.id === selectedConversation.page_id)?.page_logo_url ? (
                                <img 
                                  src={connectedPages.find(p => p.id === selectedConversation.page_id)?.page_logo_url || undefined} 
                                  alt={selectedConversation.facebook_pages.page_name} 
                                  className="w-5 h-5 rounded-full object-cover" 
                                />
                              ) : (
                                <div className={`${getPageColor(selectedConversation.page_id)} text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center`}>
                                  {selectedConversation.facebook_pages.page_name[0].toUpperCase()}
                                </div>
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{selectedConversation.facebook_pages.page_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : platform === 'all' && (selectedConversation as any)?.platform === 'instagram' && (selectedConversation as any).instagram_accounts?.account_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`${getPageColor((selectedConversation as any).instagram_account_id)} text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center`}>
                                {(selectedConversation as any).instagram_accounts.account_name[0].toUpperCase()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{(selectedConversation as any).instagram_accounts.account_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : platform === 'facebook' && selectedConversation.facebook_pages?.page_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {connectedPages.find(p => p.id === selectedConversation.page_id)?.page_logo_url ? (
                                <img 
                                  src={connectedPages.find(p => p.id === selectedConversation.page_id)?.page_logo_url || undefined} 
                                  alt={selectedConversation.facebook_pages.page_name} 
                                  className="w-5 h-5 rounded-full object-cover" 
                                />
                              ) : (
                                <div className={`${getPageColor(selectedConversation.page_id)} text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center`}>
                                  {selectedConversation.facebook_pages.page_name[0].toUpperCase()}
                                </div>
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{selectedConversation.facebook_pages.page_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : platform === 'instagram' && (selectedConversation as any).instagram_accounts?.account_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`${getPageColor((selectedConversation as any).instagram_account_id)} text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center`}>
                                {(selectedConversation as any).instagram_accounts.account_name[0].toUpperCase()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{(selectedConversation as any).instagram_accounts.account_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : platform === 'all' && (selectedConversation as any)?.platform === 'website' && (selectedConversation as any).website_widgets?.widget_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                                {(selectedConversation as any).website_widgets.widget_name[0].toUpperCase()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{(selectedConversation as any).website_widgets.widget_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : platform === 'website' && (selectedConversation as any).website_widgets?.widget_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                                {(selectedConversation as any).website_widgets.widget_name[0].toUpperCase()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p>{(selectedConversation as any).website_widgets.widget_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(selectedConversation as any).visitor
                      ? ((selectedConversation as any).visitor.visitor_email || 'No email provided')
                      : (platform === 'all' 
                          ? (selectedConversation as any).platform === 'instagram' 
                            ? `@${selectedConversation.subscriber?.subscriber_username || selectedConversation.subscriber?.subscriber_psid}` 
                            : selectedConversation.subscriber?.subscriber_psid
                          : platform === 'instagram' 
                            ? `@${selectedConversation.subscriber?.subscriber_username || selectedConversation.subscriber?.subscriber_psid}` 
                            : selectedConversation.subscriber?.subscriber_psid
                        )
                    }
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadMessageHistory} disabled={loadingHistory}>
                  {loadingHistory ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </> : <>
                      <FileText className="h-4 w-4 mr-2" />
                      Load History
                    </>}
                </Button>
                <div className="flex items-center gap-2">
                  {/* Video Call and Co-Browse buttons - Only for website conversations */}
                  {((platform === 'all' && (selectedConversation as any)?.platform === 'website') || platform === 'website') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVideoCall(true)}
                        title="Start video call"
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCoBrowse(true)}
                        title="Start co-browsing"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    title="Search messages (Ctrl+K)"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSoundState = !soundEnabled;
                      setSoundEnabled(newSoundState);
                      localStorage.setItem('liveChatSoundEnabled', String(newSoundState));
                      toast({ 
                        title: newSoundState ? "Sound enabled" : "Sound muted",
                        description: newSoundState ? "You'll hear sounds for new messages" : "Message sounds are now muted"
                      });
                    }}
                    title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-primary" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (notificationsEnabled) {
                        toast({ title: "Browser notifications are enabled" });
                      } else {
                        requestNotificationPermission();
                      }
                    }}
                    title={notificationsEnabled ? "Browser notifications enabled" : "Enable browser notifications"}
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {showMessageSearch && (
                <div className="pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {messageSearchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setMessageSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollContainerRef}>
              {loadingHistory && <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading history...</span>
                </div>}
              <div ref={messagesStartRef} />
              {messages.length === 0 ? <div className="text-center text-muted-foreground py-8">
                  No messages yet
                </div> : <div className="space-y-4">
                  {filteredMessages.map(message => <div key={message.id} className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${message.sender_type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${(message as any).status === 'failed' ? 'border-2 border-destructive' : ''}`}>
                        {message.attachment_url && <div className="mb-2">
                            {message.attachment_type?.startsWith('image/') ? (
                              <img src={message.attachment_url} alt="Attachment" className="rounded max-w-full" />
                            ) : message.attachment_type === 'audio' || message.attachment_type?.startsWith('audio/') ? (
                              <Button
                                variant={message.sender_type === 'user' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleAudioPlayback(message.attachment_url!)}
                                className={`flex items-center gap-2 ${message.sender_type === 'user' ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : ''}`}
                              >
                                {playingAudio === message.attachment_url ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                {playingAudio === message.attachment_url ? 'Pause' : 'Play'} Voice Message
                              </Button>
                            ) : (
                              <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                                <Paperclip className="h-4 w-4" />
                                View Attachment
                              </a>
                            )}
                          </div>}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(message.sent_at).toLocaleTimeString()}
                          </p>
                          {(message as any).status === 'failed' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-3 w-3 text-destructive cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{(message as any).error}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>)}
                  <div ref={messagesEndRef} />
                </div>}
            </ScrollArea>
          </CardContent>

          <div className="border-t flex-shrink-0">
              {/* 24-hour window warning - Only for Facebook conversations */}
              {((platform === 'all' && (selectedConversation as any)?.platform === 'facebook') || platform === 'facebook') && 
               !isWithin24HourWindow(selectedConversation.last_message_at) && <div className="p-3 bg-warning/10 border-b border-warning/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">24-Hour Window Expired</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getWindowStatus(selectedConversation.last_message_at)}. Use a message tag to send outside this window.
                      </p>
                    </div>
                  </div>
                </div>}

              {previewUrl && <div className="p-4 border-b relative">
                  <div className="relative inline-block">
                    <img src={previewUrl} alt="Preview" className="max-h-32 rounded" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>}

              {selectedFile && !previewUrl && <div className="p-4 border-b">
                  <div className="flex items-center gap-2 bg-muted rounded p-2">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>}

              <div className="p-4">
                <div className="flex gap-2 items-end">
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf" />

                  {/* Canned Messages - Available for all platforms */}
                  <Popover open={showCannedMessages} onOpenChange={setShowCannedMessages}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Canned Messages</h4>
                          <Button variant="ghost" size="sm" onClick={() => setShowAddCanned(!showAddCanned)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {showAddCanned && (
                        <div className="p-3 border-b space-y-2">
                          <Input 
                            placeholder="Message name" 
                            value={newCannedMessage.name}
                            onChange={(e) => setNewCannedMessage(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <Textarea 
                            placeholder="Message content" 
                            value={newCannedMessage.content}
                            onChange={(e) => setNewCannedMessage(prev => ({ ...prev, content: e.target.value }))}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveCannedMessage} className="flex-1">Save</Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setShowAddCanned(false);
                              setNewCannedMessage({ name: '', content: '' });
                            }}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      <ScrollArea className="h-64">
                        {cannedMessages.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No canned messages yet
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {cannedMessages.map((msg) => (
                              <div 
                                key={msg.id} 
                                className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                                onClick={() => useCannedMessage(msg.content)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{msg.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCannedMessage(msg.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>

                  {/* Message tag selector - Only for Facebook conversations outside 24-hour window */}
                  {((platform === 'all' && (selectedConversation as any)?.platform === 'facebook') || platform === 'facebook') &&
                   !isWithin24HourWindow(selectedConversation.last_message_at) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select value={selectedMessageTag} onValueChange={setSelectedMessageTag}>
                            <SelectTrigger className="w-10 h-10 p-0">
                              <Tag className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HUMAN_AGENT">Human Agent</SelectItem>
                              <SelectItem value="ACCOUNT_UPDATE">Account Update</SelectItem>
                              <SelectItem value="CONFIRMED_EVENT_UPDATE">Confirmed Event Update</SelectItem>
                              <SelectItem value="POST_PURCHASE_UPDATE">Post Purchase Update</SelectItem>
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Message Tag: {selectedMessageTag}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <div className="flex-1 relative">
                    <Textarea placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const messageTag = !isWithin24HourWindow(selectedConversation.last_message_at) ? selectedMessageTag : undefined;
                    sendMessage(messageTag);
                  }
                }} disabled={!isWithin24HourWindow(selectedConversation.last_message_at) && !selectedMessageTag} className="min-h-[40px] max-h-[120px] resize-none pr-20" rows={1} />
                    
                    {!isRecording && (
                      <>
                        <div className="absolute bottom-2 right-[88px]" ref={emojiPickerRef}>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                            <Smile className="h-4 w-4" />
                          </Button>
                          {showEmojiPicker && <div className="absolute bottom-10 right-0 z-50">
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>}
                        </div>
                        
                        <div className="absolute bottom-2 right-[50px]">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="absolute bottom-2 right-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={startRecording}
                          >
                            <Mic className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}

                    {isRecording && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-destructive/10 rounded-md px-3 py-1">
                        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        <span className="text-sm font-medium text-destructive">{formatRecordingTime(recordingTime)}</span>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={stopRecording}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button onClick={() => {
                const isFacebookConversation = (platform === 'all' && (selectedConversation as any)?.platform === 'facebook') || platform === 'facebook';
                const messageTag = isFacebookConversation && !isWithin24HourWindow(selectedConversation.last_message_at) ? selectedMessageTag : undefined;
                sendMessage(messageTag);
              }} disabled={
                (!newMessage.trim() && !selectedFile) || 
                (((platform === 'all' && (selectedConversation as any)?.platform === 'facebook') || platform === 'facebook') && 
                 !isWithin24HourWindow(selectedConversation.last_message_at) && 
                 !selectedMessageTag)
              }>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Live Chat Sales Panel */}
          <LiveChatSalesPanel
            userId={user?.id || ''}
            conversationId={selectedConversation.id}
            conversationType={
              (platform === 'all' && (selectedConversation as any)?.platform) || platform
            }
            customerName={
              (selectedConversation as any).visitor
                ? ((selectedConversation as any).visitor.visitor_name || 'Anonymous Visitor')
                : (selectedConversation.subscriber?.subscriber_name || selectedConversation.subscriber?.subscriber_username || 'Unknown')
            }
            customerPhone={
              (selectedConversation as any).platform === 'facebook'
                ? selectedConversation.subscriber?.subscriber_psid
                : (selectedConversation as any).platform === 'instagram'
                ? selectedConversation.subscriber?.subscriber_instagram_id
                : undefined
            }
            customerPlatformId={
              (selectedConversation as any).platform === 'facebook'
                ? selectedConversation.subscriber?.subscriber_psid
                : (selectedConversation as any).platform === 'instagram'
                ? selectedConversation.subscriber?.subscriber_instagram_id
                : undefined
            }
          />

          {/* Duplicate product panel removed - now unified in LiveChatSalesPanel */}
        </div> : <Card className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a conversation to start messaging</p>
          </div>
        </Card>}
    </div>
    
    {/* Video Call Interface */}
    {showVideoCall && selectedConversation && (selectedConversation as any).visitor && (
      <VideoCallInterface
        conversationId={selectedConversation.id}
        visitorId={(selectedConversation as any).visitor_id}
        onClose={() => setShowVideoCall(false)}
      />
    )}

    {/* Co-Browse Viewer */}
    {showCoBrowse && selectedConversation && (selectedConversation as any).visitor && (
      <CoBrowseViewer
        sessionId="" // Will be created on demand
        onClose={() => setShowCoBrowse(false)}
      />
    )}
    
    {/* Label Management Dialog */}
    <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Label</DialogTitle>
          <DialogDescription>
            Create a new label to organize your conversations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Label Name</Label>
            <Input
              placeholder="e.g., Important, Follow-up, VIP"
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 ${newLabel.color === color ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewLabel({ ...newLabel, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowLabelDialog(false)}>Cancel</Button>
          <Button onClick={createLabel} disabled={!newLabel.name.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
export default LiveChat;