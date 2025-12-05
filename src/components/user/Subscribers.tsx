import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Scan, Users, Trash2, Tag as TagIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Subscriber {
  id: string;
  subscriber_psid?: string;
  subscriber_instagram_id?: string;
  subscriber_name: string | null;
  subscriber_username?: string | null;
  profile_pic_url: string | null;
  last_interaction_time: string | null;
  created_at: string;
  tags: string[];
}

interface FacebookPage {
  id: string;
  page_name: string;
}

interface InstagramAccount {
  id: string;
  account_name: string;
}

interface SubscribersProps {
  initialPlatform?: 'facebook' | 'instagram';
}

const Subscribers = ({ initialPlatform = 'facebook' }: SubscribersProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>(initialPlatform);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Pagination calculations
  const totalPages = Math.ceil(subscribers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubscribers = subscribers.slice(startIndex, endIndex);

  useEffect(() => {
    if (user?.id) {
      loadPages();
      loadInstagramAccounts();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedPage) {
      loadSubscribers();
    }
  }, [selectedPage, platform]);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_pages')
        .select('id, page_name')
        .eq('user_id', user!.id);

      if (error) throw error;
      
      setPages(data || []);
      if (data && data.length > 0 && !selectedPage && platform === 'facebook') {
        setSelectedPage(data[0].id);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pages',
        variant: 'destructive',
      });
    }
  };

  const loadInstagramAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('id, account_name')
        .eq('user_id', user!.id);

      if (error) throw error;
      
      setInstagramAccounts(data || []);
      if (data && data.length > 0 && !selectedPage && platform === 'instagram') {
        setSelectedPage(data[0].id);
      }
    } catch (error) {
      console.error('Error loading Instagram accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Instagram accounts',
        variant: 'destructive',
      });
    }
  };

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      
      if (platform === 'facebook') {
        const { data, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('page_id', selectedPage)
          .order('last_interaction_time', { ascending: false, nullsFirst: false });

        if (error) throw error;
        setSubscribers(data || []);
      } else {
        const { data, error } = await supabase
          .from('instagram_subscribers')
          .select('*')
          .eq('instagram_account_id', selectedPage)
          .order('last_interaction_time', { ascending: false, nullsFirst: false });

        if (error) throw error;
        setSubscribers(data || []);
      }
      
      setSelectedSubscribers(new Set());
      setCurrentPage(1); // Reset to first page when loading new data
    } catch (error) {
      console.error('Error loading subscribers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscribers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    // Instagram subscribers are auto-captured via webhook
    if (platform !== 'facebook') return;
    
    if (!selectedPage) {
      toast({
        title: 'No page selected',
        description: 'Please select a page first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setScanning(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('scan-subscribers', {
        body: { pageId: selectedPage },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Scan Complete',
        description: data.message || `Found ${data.subscribersCount} subscribers`,
      });

      await loadSubscribers();
    } catch (error: any) {
      console.error('Error scanning subscribers:', error);
      toast({
        title: 'Scan Failed',
        description: error.message || 'Failed to scan subscribers',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubscribers(new Set(subscribers.map(s => s.id)));
    } else {
      setSelectedSubscribers(new Set());
    }
  };

  const handleSelectSubscriber = (subscriberId: string, checked: boolean) => {
    const newSelected = new Set(selectedSubscribers);
    if (checked) {
      newSelected.add(subscriberId);
    } else {
      newSelected.delete(subscriberId);
    }
    setSelectedSubscribers(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      setDeleting(true);
      const idsToDelete = Array.from(selectedSubscribers);
      
      if (platform === 'facebook') {
        const { error } = await supabase
          .from('subscribers')
          .delete()
          .in('id', idsToDelete);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instagram_subscribers')
          .delete()
          .in('id', idsToDelete);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Deleted ${idsToDelete.length} subscriber(s) and their conversations`,
      });

      await loadSubscribers();
      setDeleteDialogOpen(false);
      setSelectedSubscribers(new Set());
    } catch (error: any) {
      console.error('Error deleting subscribers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subscribers',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const idColumn = platform === 'facebook' ? 'page_id' : 'instagram_account_id';
      
      if (platform === 'facebook') {
        const { error } = await supabase
          .from('subscribers')
          .delete()
          .eq('page_id', selectedPage);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instagram_subscribers')
          .delete()
          .eq('instagram_account_id', selectedPage);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'All subscribers and their conversations have been deleted',
      });

      await loadSubscribers();
      setDeleteAllDialogOpen(false);
      setSelectedSubscribers(new Set());
    } catch (error: any) {
      console.error('Error deleting all subscribers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete all subscribers',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkTag = async () => {
    if (!newTag.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a tag',
        variant: 'destructive',
      });
      return;
    }

    try {
      const idsToTag = Array.from(selectedSubscribers);
      
      // Get current tags for each subscriber and add new tag
      const updates = await Promise.all(
        idsToTag.map(async (id) => {
          const subscriber = subscribers.find(s => s.id === id);
          const currentTags = subscriber?.tags || [];
          const updatedTags = currentTags.includes(newTag.trim())
            ? currentTags
            : [...currentTags, newTag.trim()];
          
          if (platform === 'facebook') {
            return supabase
              .from('subscribers')
              .update({ tags: updatedTags })
              .eq('id', id);
          } else {
            return supabase
              .from('instagram_subscribers')
              .update({ tags: updatedTags })
              .eq('id', id);
          }
        })
      );

      const errors = updates.filter(u => u.error);
      if (errors.length > 0) {
        throw new Error('Failed to tag some subscribers');
      }

      toast({
        title: 'Success',
        description: `Tagged ${idsToTag.length} subscriber(s)`,
      });

      setNewTag('');
      setTagDialogOpen(false);
      await loadSubscribers();
    } catch (error: any) {
      console.error('Error tagging subscribers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to tag subscribers',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveTag = async (subscriberId: string, tagToRemove: string) => {
    try {
      const subscriber = subscribers.find(s => s.id === subscriberId);
      if (!subscriber) return;

      const updatedTags = subscriber.tags.filter(tag => tag !== tagToRemove);
      
      if (platform === 'facebook') {
        const { error } = await supabase
          .from('subscribers')
          .update({ tags: updatedTags })
          .eq('id', subscriberId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instagram_subscribers')
          .update({ tags: updatedTags })
          .eq('id', subscriberId);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Tag removed',
      });

      await loadSubscribers();
    } catch (error: any) {
      console.error('Error removing tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive',
      });
    }
  };

  if (pages.length === 0 && instagramAccounts.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No pages or accounts connected</p>
          <p className="text-sm text-muted-foreground">Connect a Facebook page or Instagram account to view subscribers</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscriber List</CardTitle>
            <CardDescription>
              {platform === 'facebook' 
                ? 'People who have messaged your Facebook page' 
                : 'People who have messaged your Instagram account'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={`Select ${platform === 'facebook' ? 'page' : 'account'}`} />
              </SelectTrigger>
              <SelectContent>
                {platform === 'facebook' 
                  ? pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.page_name}
                      </SelectItem>
                    ))
                  : instagramAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
            <Button onClick={loadSubscribers} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {platform === 'facebook' ? (
              <Button onClick={handleScan} disabled={scanning || !selectedPage}>
                {scanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4 mr-2" />
                )}
                Scan Page
              </Button>
            ) : (
              <Button disabled variant="outline" className="cursor-not-allowed">
                <Scan className="h-4 w-4 mr-2" />
                Auto-captured via Webhook
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedSubscribers.size > 0 && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedSubscribers.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTagDialogOpen(true)}
              >
                <TagIcon className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No subscribers found</p>
            <Button onClick={handleScan} disabled={scanning}>
              <Scan className="h-4 w-4 mr-2" />
              Scan for Subscribers
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSubscribers.size === subscribers.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>{platform === 'facebook' ? 'PSID' : 'Instagram ID'}</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id} className="h-12">
                    <TableCell className="py-2">
                      <Checkbox
                        checked={selectedSubscribers.has(subscriber.id)}
                        onCheckedChange={(checked) =>
                          handleSelectSubscriber(subscriber.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={subscriber.profile_pic_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(subscriber.subscriber_name || subscriber.subscriber_username)?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {subscriber.subscriber_name || subscriber.subscriber_username || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono py-2">
                      {platform === 'facebook' ? subscriber.subscriber_psid : subscriber.subscriber_instagram_id}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {subscriber.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs h-5">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(subscriber.id, tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {subscriber.last_interaction_time
                        ? format(new Date(subscriber.last_interaction_time), 'MMM dd, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {format(new Date(subscriber.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {subscribers.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Total subscribers: {subscribers.length}
              </span>
              <span className="text-xs text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, subscribers.length)} of {subscribers.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Delete Selected Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Selected Subscribers?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {selectedSubscribers.size} subscriber(s) and all their
            conversations and messages. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete All Dialog */}
    <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Subscribers?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete ALL {subscribers.length} subscribers from this page
            and all their conversations and messages. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAll}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete All'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Tag Dialog */}
    <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tag to Selected Subscribers</DialogTitle>
          <DialogDescription>
            Add a tag to {selectedSubscribers.size} selected subscriber(s)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag">Tag Name</Label>
            <Input
              id="tag"
              placeholder="e.g., VIP, Customer, Lead"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleBulkTag();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkTag}>Add Tag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
};

export default Subscribers;