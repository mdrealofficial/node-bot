import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TicketNotificationBellProps {
  onTicketClick: (ticketId: string) => void;
}

export function TicketNotificationBell({ onTicketClick }: TicketNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadRecentTickets();
    subscribeToTickets();
  }, []);

  const loadRecentTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, priority, status, created_at')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setTickets(data);
      setUnreadCount(data.filter(t => t.status === 'open').length);
    }
  };

  const subscribeToTickets = () => {
    const channel = supabase
      .channel('ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          loadRecentTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTicketClick = (ticketId: string) => {
    setOpen(false);
    onTicketClick(ticketId);
  };

  const priorityColors: Record<string, string> = {
    urgent: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-blue-500',
    low: 'text-slate-500',
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Support Tickets</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tickets.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No open tickets
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {tickets.map((ticket) => (
              <DropdownMenuItem
                key={ticket.id}
                onClick={() => handleTicketClick(ticket.id)}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                  {ticket.priority === 'urgent' && (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`ml-auto text-xs ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-sm font-medium truncate w-full">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleTicketClick('')}
          className="text-center justify-center text-primary"
        >
          View All Tickets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
