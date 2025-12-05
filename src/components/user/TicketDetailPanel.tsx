import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Image, Video, Loader2, Clock, CheckCircle, User, Shield, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface Attachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface TicketDetailPanelProps {
  ticket: Ticket;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  waiting_customer: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const categoryLabels: Record<string, string> = {
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  general_support: 'General Support',
  technical_support: 'Technical Support',
  billing_management: 'Billing',
};

export function TicketDetailPanel({ ticket, onBack }: TicketDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadTicketDetails();
    loadMessages();
    loadAttachments();
    subscribeToMessages();
  }, [ticket.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicketDetails = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    if (!error && data) {
      setCurrentTicket(data);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    const { data } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    setAttachments(data || []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticket.id}`,
        },
        () => {
          loadTicketDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      setSending(true);

      // Create message
      const { data: messageData, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user?.id,
          sender_type: 'user',
          message: newMessage.trim() || 'Attachment',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload attachments
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${ticket.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) continue;

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        await supabase.from('ticket_attachments').insert({
          ticket_id: ticket.id,
          message_id: messageData.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });
      }

      // Update ticket status if it was waiting_customer
      if (currentTicket.status === 'waiting_customer') {
        await supabase
          .from('support_tickets')
          .update({ status: 'open' })
          .eq('id', ticket.id);
      }

      setNewMessage('');
      setSelectedFiles([]);
      loadAttachments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(prev => [...prev, ...Array.from(files)]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getMessageAttachments = (messageId: string) => {
    return attachments.filter(a => a.message_id === messageId);
  };

  const ticketAttachments = attachments.filter(a => !a.message_id);

  const isTicketClosed = ['resolved', 'closed'].includes(currentTicket.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">
              {currentTicket.ticket_number}
            </span>
            <Badge variant="outline" className={statusColors[currentTicket.status]}>
              {currentTicket.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={priorityColors[currentTicket.priority]}>
              {currentTicket.priority}
            </Badge>
          </div>
          <h1 className="text-xl font-bold">{currentTicket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Messages */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial description */}
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">You</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(currentTicket.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border">
                    <p className="text-sm whitespace-pre-wrap">{currentTicket.description}</p>
                    {ticketAttachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ticketAttachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border text-xs hover:bg-accent"
                          >
                            {att.file_type.startsWith('image/') ? (
                              <Image className="h-3 w-3" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            {att.file_name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              {messages.map((message) => {
                const messageAttachments = getMessageAttachments(message.id);
                const isAdmin = message.sender_type === 'admin';

                return (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={isAdmin ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"}>
                        {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {isAdmin ? 'Support Team' : 'You'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isAdmin ? "bg-green-500/5" : "bg-primary/5"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        {messageAttachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {messageAttachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border text-xs hover:bg-accent"
                              >
                                {att.file_type.startsWith('image/') ? (
                                  <Image className="h-3 w-3" />
                                ) : (
                                  <Video className="h-3 w-3" />
                                )}
                                {att.file_name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Message Input */}
            {!isTicketClosed ? (
              <div className="p-4 border-t">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button onClick={() => removeFile(index)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[80px] pr-10 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 p-1.5 rounded hover:bg-accent"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </div>
                  <Button onClick={handleSendMessage} disabled={sending} size="icon" className="h-[80px]">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  This ticket has been {currentTicket.status}. Create a new ticket if you need further assistance.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Details Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <p className="font-medium">{categoryLabels[currentTicket.category]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <Badge variant="outline" className={priorityColors[currentTicket.priority]}>
                  {currentTicket.priority}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant="outline" className={statusColors[currentTicket.status]}>
                  {currentTicket.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{format(new Date(currentTicket.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm">{format(new Date(currentTicket.updated_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attachments ({attachments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors"
                    >
                      {att.file_type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate flex-1">{att.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(att.file_size / 1024).toFixed(1)}KB
                      </span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
