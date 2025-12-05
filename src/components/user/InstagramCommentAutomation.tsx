import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, MessageSquare, History, ImageOff, Eye, RefreshCw, ChevronLeft, ChevronRight, List, FileText, Play, Pause, Settings, User, Users, AtSign, Send, Clock, Bot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InstagramCommentTrigger {
  id: string;
  name: string;
  trigger_type: 'keyword' | 'full_account';
  is_active: boolean;
  instagram_account_id: string;
  post_id?: string;
  censored_keywords?: string[];
  reply_mode?: 'generic' | 'keyword_based' | 'ai';
  generic_message?: string;
  trigger_keywords?: string[];
  match_type?: 'exact' | 'contains';
  keyword_reply_message?: string;
  no_match_reply_message?: string;
  exclude_keywords?: string[];
  min_comment_length?: number;
  max_comment_length?: number | null;
  reply_to_replies?: boolean;
  send_dm_after_reply?: boolean;
  dm_message?: string;
  dm_message_text?: string;
  dm_delay_seconds?: number;
  dm_conditions?: {
    always?: boolean;
    min_comment_length?: number;
    keywords?: string[];
  };
  profanity_level?: string;
  spam_detection_enabled?: boolean;
  link_detection_enabled?: boolean;
  moderation_action?: string;
  whitelist_users?: string[];
  blacklist_users?: string[];
  ai_enabled?: boolean;
  ai_prompt?: string;
  public_reply_message?: string;
  keyword_filters?: Array<{
    keywords: string[];
    matchType: 'exact' | 'contains';
    replyMessage: string;
  }>;
}

interface InstagramAccount {
  id: string;
  instagram_username: string;
  account_name: string;
  access_token: string;
  instagram_account_id: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

export const InstagramCommentAutomation = () => {
  const { user } = useAuth();
  const [triggers, setTriggers] = useState<InstagramCommentTrigger[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<InstagramCommentTrigger | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [replyHistory, setReplyHistory] = useState<any[]>([]);
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<string>('');
  const [selectedPostForApply, setSelectedPostForApply] = useState<string>('');
  const [applyTemplatePosts, setApplyTemplatePosts] = useState<InstagramPost[]>([]);
  const [loadingApplyPosts, setLoadingApplyPosts] = useState(false);
  const [recentPosts, setRecentPosts] = useState<InstagramPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postSelectionMode, setPostSelectionMode] = useState<'recent' | 'manual'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [triggerStats, setTriggerStats] = useState<Record<string, {
    totalReplies: number;
    successRate: number;
    topKeywords: { keyword: string; count: number }[];
  }>>({});
  const [flows, setFlows] = useState<any[]>([]);
  const [keywordFilters, setKeywordFilters] = useState<Array<{ keywords: string; matchType: 'exact' | 'contains'; replyMessage: string }>>([
    { keywords: '', matchType: 'contains', replyMessage: '' }
  ]);

  // Refs for textarea elements
  const genericMessageRef = useRef<HTMLTextAreaElement>(null);
  const keywordReplyRef = useRef<HTMLTextAreaElement>(null);
  const noMatchReplyRef = useRef<HTMLTextAreaElement>(null);
  const dmMessageRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'keyword' as 'keyword' | 'full_account',
    instagram_account_id: '',
    post_id: '',
    is_active: true,
    censored_keywords: '',
    reply_mode: 'generic' as 'generic' | 'keyword_based' | 'ai',
    generic_message: '',
    trigger_keywords: '',
    match_type: 'contains' as 'exact' | 'contains',
    keyword_reply_message: '',
    no_match_reply_message: '',
    exclude_keywords: '',
    min_comment_length: 0,
    max_comment_length: '',
    reply_to_replies: false,
    send_dm_after_reply: false,
    dm_message_type: 'text' as 'text' | 'flow',
    dm_message_text: '',
    dm_flow_id: '',
    dm_delay_seconds: 0,
    dm_condition_type: 'always' as 'always' | 'keywords' | 'min_length',
    dm_condition_keywords: '',
    dm_condition_min_length: 0,
    no_match_dm_enabled: false,
    no_match_dm_type: 'text' as 'text' | 'flow',
    no_match_dm_text: '',
    no_match_dm_flow_id: '',
    profanity_level: 'none',
    spam_detection_enabled: false,
    link_detection_enabled: false,
    moderation_action: 'none',
    whitelist_users: '',
    blacklist_users: '',
    ai_enabled: false,
    ai_prompt: '',
    public_reply_message: '',
  });

  useEffect(() => {
    loadAccounts();
    loadTriggers();
    loadTriggerStats();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadFlows(selectedAccountId);
      fetchRecentPosts(selectedAccountId);
    }
  }, [selectedAccountId]);

  // Set first account as selected when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const loadFlows = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('instagram_chatbot_flows')
        .select('id, name, description, is_active')
        .eq('instagram_account_id', accountId)
        .eq('is_active', true);
      
      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const loadTriggerStats = async () => {
    try {
      const { data: replies, error } = await supabase
        .from('instagram_comment_replies')
        .select('trigger_id, comment_text, created_at, dm_sent, public_reply_sent')
        .eq('user_id', user?.id);

      if (error) throw error;

      const stats: Record<string, {
        totalReplies: number;
        successRate: number;
        topKeywords: { keyword: string; count: number }[];
      }> = {};

      // Group replies by trigger
      replies?.forEach((reply) => {
        if (!reply.trigger_id) return;

        if (!stats[reply.trigger_id]) {
          stats[reply.trigger_id] = {
            totalReplies: 0,
            successRate: 0,
            topKeywords: []
          };
        }

        stats[reply.trigger_id].totalReplies++;
      });

      // Get current triggers to access trigger keywords
      const currentTriggers = triggers.length > 0 ? triggers : (
        await supabase
          .from('instagram_comment_triggers')
          .select('*')
          .eq('user_id', user?.id)
      ).data || [];

      // Calculate success rate and extract keywords for each trigger
      for (const triggerId in stats) {
        const triggerReplies = replies?.filter(r => r.trigger_id === triggerId) || [];
        const successfulReplies = triggerReplies.filter(r => r.dm_sent || r.public_reply_sent);
        stats[triggerId].successRate = triggerReplies.length > 0 
          ? Math.round((successfulReplies.length / triggerReplies.length) * 100)
          : 0;

        // Extract keywords from comments
        const keywordCounts: Record<string, number> = {};
        const trigger = currentTriggers.find((t: any) => t.id === triggerId);
        
        if (trigger?.trigger_keywords) {
          triggerReplies.forEach(reply => {
            const commentLower = reply.comment_text?.toLowerCase() || '';
            trigger.trigger_keywords?.forEach((keyword: string) => {
              if (commentLower.includes(keyword.toLowerCase())) {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
              }
            });
          });

          stats[triggerId].topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([keyword, count]) => ({ keyword, count }));
        }
      }

      setTriggerStats(stats);
    } catch (error: any) {
      console.error('Failed to load trigger stats:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('id, instagram_username, account_name, access_token, instagram_account_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('Failed to load accounts');
      console.error(error);
    }
  };

  const loadTriggers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instagram_comment_triggers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTriggers((data || []) as any as InstagramCommentTrigger[]);
      
      // Reload stats after triggers are loaded
      await loadTriggerStats();
    } catch (error: any) {
      toast.error('Failed to load triggers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPosts = async (accountId: string) => {
    if (!accountId) return;
    
    try {
      setLoadingPosts(true);
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        setLoadingPosts(false);
        return;
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${account.instagram_account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=50&access_token=${account.access_token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Instagram API error:', errorData);
        toast.error('Failed to fetch posts from Instagram');
        setLoadingPosts(false);
        return;
      }

      const data = await response.json();
      setRecentPosts(data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch recent posts:', error);
      toast.error('Failed to fetch recent posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadReplyHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_comment_replies')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReplyHistory(data || []);
      setShowHistoryDialog(true);
    } catch (error: any) {
      toast.error('Failed to load reply history');
      console.error(error);
    }
  };

  const loadApplyTemplatePosts = async () => {
    if (!selectedAccountId) return;
    
    try {
      setLoadingApplyPosts(true);
      const account = accounts.find(a => a.id === selectedAccountId);
      if (!account) return;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${account.instagram_account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=50&access_token=${account.access_token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Instagram API error:', errorData);
        toast.error('Failed to fetch posts from Instagram');
        setLoadingApplyPosts(false);
        return;
      }

      const data = await response.json();
      setApplyTemplatePosts(data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to fetch posts');
    } finally {
      setLoadingApplyPosts(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateForApply || !selectedPostForApply) {
      toast.error('Please select both a template and a post');
      return;
    }

    try {
      const template = triggers.find(t => t.id === selectedTemplateForApply);
      if (!template) {
        toast.error('Template not found');
        return;
      }

      // Create a new individual post trigger based on the selected template
      const { error } = await supabase
        .from('instagram_comment_triggers')
        .insert([{
          user_id: user?.id,
          name: `${template.name} - Applied`,
          trigger_type: 'keyword',
          instagram_account_id: selectedAccountId,
          post_id: selectedPostForApply,
          is_active: true,
          trigger_keywords: template.trigger_keywords || [],
          match_type: template.match_type || 'contains',
          exclude_keywords: template.exclude_keywords || [],
          dm_message: template.dm_message_text || template.dm_message || '',
          public_reply_message: template.public_reply_message,
          reply_to_replies: template.reply_to_replies || false,
        }]);

      if (error) throw error;

      toast.success('Template applied to post successfully');
      setShowApplyTemplateDialog(false);
      setSelectedTemplateForApply('');
      setSelectedPostForApply('');
      loadTriggers();
    } catch (error: any) {
      toast.error('Failed to apply template');
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.instagram_account_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate reply mode requirements
      if (formData.reply_mode === 'generic') {
        if (!formData.generic_message && !formData.public_reply_message) {
          toast.error('Please provide a generic reply message');
          return;
        }
      } else if (formData.reply_mode === 'keyword_based') {
        // Aggregate keywords from all filter sets
        const aggregatedKeywords = keywordFilters
          .flatMap((filter) => filter.keywords.split(','))
          .map((k) => k.trim())
          .filter((k) => k);

        if (aggregatedKeywords.length === 0) {
          toast.error('Please provide at least one trigger keyword');
          return;
        }

        const hasFilterReply = keywordFilters.some(
          (filter) => filter.replyMessage && filter.replyMessage.trim().length > 0
        );

        if (!hasFilterReply && !formData.public_reply_message) {
          toast.error('Please provide a keyword reply message');
          return;
        }
      } else if (formData.reply_mode === 'ai') {
        if (!formData.ai_prompt) {
          toast.error('Please provide an AI prompt');
          return;
        }
      }

      const triggerData: any = {
        user_id: user?.id,
        name: formData.name,
        trigger_type: formData.trigger_type,
        instagram_account_id: formData.instagram_account_id,
        is_active: formData.is_active,
        send_dm_after_reply: formData.send_dm_after_reply,
        dm_message: formData.send_dm_after_reply ? formData.dm_message_text : null,
        dm_message_text: formData.send_dm_after_reply ? formData.dm_message_text : null,
        dm_delay_seconds: formData.send_dm_after_reply ? formData.dm_delay_seconds : 0,
        dm_conditions: formData.send_dm_after_reply
          ? (() => {
              if (formData.dm_condition_type === 'keywords') {
                return {
                  keywords: formData.dm_condition_keywords
                    .split(',')
                    .map((k) => k.trim())
                    .filter((k) => k),
                };
              } else if (formData.dm_condition_type === 'min_length') {
                return { min_comment_length: formData.dm_condition_min_length };
              } else {
                return { always: true };
              }
            })()
          : { always: true },
        profanity_level: formData.profanity_level,
        spam_detection_enabled: formData.spam_detection_enabled,
        link_detection_enabled: formData.link_detection_enabled,
        moderation_action: formData.moderation_action,
        whitelist_users: formData.whitelist_users
          .split(',')
          .map((u) => u.trim())
          .filter((u) => u),
        blacklist_users: formData.blacklist_users
          .split(',')
          .map((u) => u.trim())
          .filter((u) => u),
        public_reply_message: formData.public_reply_message || null,
      };

      // Save reply mode settings for BOTH keyword AND full_account types
      triggerData.reply_mode = formData.reply_mode;
      
      if (formData.reply_mode === 'generic') {
        triggerData.generic_message = formData.generic_message;
      } else if (formData.reply_mode === 'ai') {
        triggerData.ai_enabled = formData.ai_enabled;
        triggerData.ai_prompt = formData.ai_prompt;
      } else {
        // Store all filter sets in the new keyword_filters JSONB column
        const validFilters = keywordFilters
          .filter(filter => filter.keywords.trim())
          .map(filter => ({
            keywords: filter.keywords.split(',').map(k => k.trim()).filter(k => k),
            matchType: filter.matchType,
            replyMessage: filter.replyMessage
          }));

        triggerData.keyword_filters = validFilters;

        // For backward compatibility, also populate old columns with first filter
        if (validFilters.length > 0) {
          triggerData.trigger_keywords = validFilters[0].keywords;
          triggerData.match_type = validFilters[0].matchType;
          triggerData.keyword_reply_message = validFilters[0].replyMessage;
        }
        triggerData.no_match_reply_message = formData.no_match_reply_message;
      }
      
      // Common advanced settings for both keyword and full_account types
      triggerData.exclude_keywords = formData.exclude_keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);
      triggerData.min_comment_length = formData.min_comment_length || 0;
      triggerData.max_comment_length = formData.max_comment_length
        ? parseInt(formData.max_comment_length)
        : null;
      triggerData.reply_to_replies = formData.reply_to_replies;
      triggerData.censored_keywords = formData.censored_keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);

      // Only set post_id for keyword type (not for full_account)
      if (formData.trigger_type === 'keyword') {
        triggerData.post_id = formData.post_id || null;
      }

      if (editingTrigger) {
        const { error } = await supabase
          .from('instagram_comment_triggers')
          .update(triggerData)
          .eq('id', editingTrigger.id);

        if (error) throw error;
        toast.success('Trigger updated successfully');
      } else {
        const { error } = await supabase
          .from('instagram_comment_triggers')
          .insert([triggerData]);

        if (error) throw error;
        toast.success('Trigger created successfully');
      }

      setShowDialog(false);
      resetForm();
      loadTriggers();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save trigger';
      toast.error(errorMessage);
      console.error('Save trigger error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (trigger?.trigger_type === 'full_account') {
      toast.error('Full account triggers cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      const { error } = await supabase
        .from('instagram_comment_triggers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Trigger deleted successfully');
      loadTriggers();
    } catch (error: any) {
      toast.error('Failed to delete trigger');
      console.error(error);
    }
  };

  const handleEdit = (trigger: InstagramCommentTrigger) => {
    setEditingTrigger(trigger);
    setFormData({
      name: trigger.name,
      trigger_type: trigger.trigger_type,
      instagram_account_id: trigger.instagram_account_id,
      post_id: trigger.post_id || '',
      is_active: trigger.is_active,
      censored_keywords: trigger.censored_keywords?.join(', ') || '',
      reply_mode: trigger.reply_mode || 'generic',
      generic_message: trigger.generic_message || '',
      trigger_keywords: trigger.trigger_keywords?.join(', ') || '',
      match_type: trigger.match_type || 'contains',
      keyword_reply_message: trigger.keyword_reply_message || '',
      no_match_reply_message: trigger.no_match_reply_message || '',
      exclude_keywords: trigger.exclude_keywords?.join(', ') || '',
      min_comment_length: trigger.min_comment_length || 0,
      max_comment_length: trigger.max_comment_length?.toString() || '',
      reply_to_replies: trigger.reply_to_replies || false,
      send_dm_after_reply: trigger.send_dm_after_reply || false,
      dm_message_type: 'text' as 'text' | 'flow',
      dm_message_text: trigger.dm_message_text || trigger.dm_message || '',
      dm_flow_id: '',
      dm_delay_seconds: trigger.dm_delay_seconds || 0,
      dm_condition_type: (trigger.dm_conditions?.always ? 'always' : 
                         trigger.dm_conditions?.keywords ? 'keywords' : 'min_length') as 'always' | 'keywords' | 'min_length',
      dm_condition_keywords: trigger.dm_conditions?.keywords?.join(', ') || '',
      dm_condition_min_length: trigger.dm_conditions?.min_comment_length || 0,
      no_match_dm_enabled: false,
      no_match_dm_type: 'text' as 'text' | 'flow',
      no_match_dm_text: '',
      no_match_dm_flow_id: '',
      profanity_level: trigger.profanity_level || 'none',
      spam_detection_enabled: trigger.spam_detection_enabled || false,
      link_detection_enabled: trigger.link_detection_enabled || false,
      moderation_action: trigger.moderation_action || 'none',
      whitelist_users: trigger.whitelist_users?.join(', ') || '',
      blacklist_users: trigger.blacklist_users?.join(', ') || '',
      ai_enabled: trigger.ai_enabled || false,
      ai_prompt: trigger.ai_prompt || '',
      public_reply_message: trigger.public_reply_message || '',
    });
    
    // Populate keywordFilters from database - prefer new keyword_filters column
    if (trigger.keyword_filters && Array.isArray(trigger.keyword_filters) && trigger.keyword_filters.length > 0) {
      setKeywordFilters(trigger.keyword_filters.map((filter: any) => ({
        keywords: Array.isArray(filter.keywords) ? filter.keywords.join(', ') : filter.keywords,
        matchType: filter.matchType || 'contains',
        replyMessage: filter.replyMessage || ''
      })));
    } else if (trigger.trigger_keywords && trigger.trigger_keywords.length > 0) {
      // Fallback to old columns for backward compatibility
      setKeywordFilters([{
        keywords: trigger.trigger_keywords.join(', '),
        matchType: trigger.match_type || 'contains',
        replyMessage: trigger.keyword_reply_message || ''
      }]);
    } else {
      setKeywordFilters([{ keywords: '', matchType: 'contains', replyMessage: '' }]);
    }
    
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'keyword',
      instagram_account_id: selectedAccountId,
      post_id: '',
      is_active: true,
      censored_keywords: '',
      reply_mode: 'generic',
      generic_message: '',
      trigger_keywords: '',
      match_type: 'contains',
      keyword_reply_message: '',
      no_match_reply_message: '',
      exclude_keywords: '',
      min_comment_length: 0,
      max_comment_length: '',
      reply_to_replies: false,
      send_dm_after_reply: false,
      dm_message_type: 'text',
      dm_message_text: '',
      dm_flow_id: '',
      dm_delay_seconds: 0,
      dm_condition_type: 'always',
      dm_condition_keywords: '',
      dm_condition_min_length: 0,
      no_match_dm_enabled: false,
      no_match_dm_type: 'text',
      no_match_dm_text: '',
      no_match_dm_flow_id: '',
      profanity_level: 'none',
      spam_detection_enabled: false,
      link_detection_enabled: false,
      moderation_action: 'none',
      whitelist_users: '',
      blacklist_users: '',
      ai_enabled: false,
      ai_prompt: '',
      public_reply_message: '',
    });
    setEditingTrigger(null);
    setKeywordFilters([{ keywords: '', matchType: 'contains', replyMessage: '' }]);
  };

  const insertVariable = (variable: string, textareaRef: React.RefObject<HTMLTextAreaElement>, fieldName: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData[fieldName as keyof typeof formData] as string;
    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
    
    setFormData({ ...formData, [fieldName]: newValue });
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'keyword':
        return 'Individual Post';
      case 'full_account':
        return 'Full Account';
      default:
        return type;
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.instagram_username || 'Unknown Account';
  };

  const toggleTriggerStatus = async (trigger: InstagramCommentTrigger) => {
    try {
      const { error } = await supabase
        .from('instagram_comment_triggers')
        .update({ is_active: !trigger.is_active })
        .eq('id', trigger.id);

      if (error) throw error;
      
      toast.success(`Trigger ${!trigger.is_active ? 'activated' : 'deactivated'}`);
      loadTriggers();
    } catch (error: any) {
      toast.error('Failed to update trigger status');
      console.error(error);
    }
  };

  // Filter triggers by selected account
  const filteredTriggers = triggers.filter(t => t.instagram_account_id === selectedAccountId);
  
  // Separate triggers by type
  const fullAccountTriggers = filteredTriggers.filter(t => t.trigger_type === 'full_account');
  const keywordTriggers = filteredTriggers.filter(t => t.trigger_type === 'keyword');

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-base font-medium">Select account</Label>
            <div className="w-80">
              {accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No Instagram accounts connected. Please connect an account first.</p>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an Instagram account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.instagram_username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" onClick={loadReplyHistory}>
              <History className="mr-2 h-4 w-4" />
              Reply History
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApplyTemplateDialog(true);
                loadApplyTemplatePosts();
              }}
              disabled={!selectedAccountId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Apply Template to Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedAccountId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select an account</h3>
            <p className="text-muted-foreground text-center">
              Choose an Instagram account to view its automation triggers
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="enabled" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="enabled">
              <Play className="h-4 w-4 mr-2" />
              Active Posts
            </TabsTrigger>
            <TabsTrigger value="triggers">
              <FileText className="h-4 w-4 mr-2" />
              Reply Templates
            </TabsTrigger>
            <TabsTrigger value="global">
              <Settings className="h-4 w-4 mr-2" />
              Global Settings
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Active Posts */}
          <TabsContent value="enabled" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Post Automations</CardTitle>
                <CardDescription>
                  Individual posts with auto-reply currently enabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {keywordTriggers.filter(t => t.is_active).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No active post automations yet. Enable triggers from the Templates tab.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {keywordTriggers.filter(t => t.is_active).map((trigger) => {
                      const stats = triggerStats[trigger.id];
                      return (
                        <Card key={trigger.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{trigger.name}</CardTitle>
                                  <Badge variant="default">Active</Badge>
                                  {trigger.post_id && (
                                    <Badge variant="outline">Post: {trigger.post_id.slice(0, 15)}...</Badge>
                                  )}
                                </div>
                                {stats && (
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>📊 {stats.totalReplies} replies</span>
                                    <span>✅ {stats.successRate}% success rate</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleTriggerStatus(trigger)}
                                  title="Disable"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(trigger)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(trigger.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {trigger.reply_mode === 'keyword_based' && trigger.trigger_keywords && trigger.trigger_keywords.length > 0 && (
                                <div>
                                  <span className="font-medium">Trigger Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {trigger.trigger_keywords.map((keyword, idx) => (
                                      <Badge key={idx} variant="secondary">{keyword}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {stats && stats.topKeywords.length > 0 && (
                                <div className="mt-2">
                                  <span className="font-medium">Top Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {stats.topKeywords.map((kw, idx) => (
                                      <Badge key={idx} variant="outline">{kw.keyword} ({kw.count})</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Reply Templates */}
          <TabsContent value="triggers" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reply Templates</CardTitle>
                    <CardDescription>
                      Create templates for specific posts or use across multiple posts
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    resetForm();
                    setShowDialog(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {keywordTriggers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No reply templates yet. Create your first template to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {keywordTriggers.map((trigger) => {
                      const stats = triggerStats[trigger.id];
                      return (
                        <Card key={trigger.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{trigger.name}</CardTitle>
                                  {trigger.is_active ? (
                                    <Badge variant="default">Active</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                  <Badge variant="outline">{getTriggerTypeLabel(trigger.trigger_type)}</Badge>
                                  {trigger.post_id && (
                                    <Badge variant="outline">Post: {trigger.post_id.slice(0, 15)}...</Badge>
                                  )}
                                </div>
                                {stats && (
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>📊 {stats.totalReplies} replies</span>
                                    <span>✅ {stats.successRate}% success rate</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleTriggerStatus(trigger)}
                                  title={trigger.is_active ? 'Disable' : 'Enable'}
                                >
                                  {trigger.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(trigger)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(trigger.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {stats && stats.topKeywords.length > 0 && (
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Top Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {stats.topKeywords.map((kw, idx) => (
                                      <Badge key={idx} variant="outline">{kw.keyword} ({kw.count})</Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Global Settings */}
          <TabsContent value="global" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Full Account Reply Template</CardTitle>
                <CardDescription>
                  Configure automated replies for all posts on this account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fullAccountTriggers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center mb-4">
                      No full account template configured yet.
                    </p>
                    <Button onClick={() => {
                      resetForm();
                      setFormData({ ...formData, trigger_type: 'full_account' });
                      setShowDialog(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Full Account Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fullAccountTriggers.map((trigger) => (
                      <Card key={trigger.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{trigger.name}</CardTitle>
                                {trigger.is_active ? (
                                  <Badge variant="default">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                                <Badge variant="outline">All Posts</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                @{getAccountName(trigger.instagram_account_id)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleTriggerStatus(trigger)}
                                title={trigger.is_active ? 'Disable' : 'Enable'}
                              >
                                {trigger.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(trigger)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {trigger.generic_message && (
                              <div>
                                <span className="font-medium">Reply Message:</span>
                                <p className="text-muted-foreground mt-1">{trigger.generic_message.slice(0, 100)}...</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Template Creation/Edit Dialog with 5 Tabs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrigger ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="dm">DM Settings</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Price Inquiry Replies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Instagram Account *</Label>
                <Select
                  value={formData.instagram_account_id}
                  onValueChange={(value) => setFormData({ ...formData, instagram_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.instagram_username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger_type === 'keyword' && (
                <div className="space-y-2">
                  <Label htmlFor="post_id">Post Selection</Label>
                  <div className="space-y-3">
                    <Select
                      value={postSelectionMode}
                      onValueChange={(value: 'recent' | 'manual') => setPostSelectionMode(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recent Posts</SelectItem>
                        <SelectItem value="manual">Manual Entry (Dark Posts/Ads)</SelectItem>
                      </SelectContent>
                    </Select>

                    {postSelectionMode === 'manual' ? (
                      <Input
                        id="post_id"
                        placeholder="Enter post ID for dark posts or ads"
                        value={formData.post_id}
                        onChange={(e) => setFormData({ ...formData, post_id: e.target.value })}
                      />
                    ) : (
                      <div className="space-y-2">
                        {loadingPosts ? (
                          <div className="flex items-center justify-center p-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : recentPosts.length > 0 ? (
                          <>
                            <ScrollArea className="h-[300px] border rounded-md p-4">
                              <div className="grid gap-3">
                                {recentPosts.map((post) => (
                                  <Card
                                    key={post.id}
                                    className={`cursor-pointer transition-colors ${
                                      formData.post_id === post.id ? 'border-primary bg-accent' : 'hover:bg-accent'
                                    }`}
                                    onClick={() => setFormData({ ...formData, post_id: post.id })}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex gap-3">
                                        {(post.media_url || post.thumbnail_url) && (
                                          <img
                                            src={post.thumbnail_url || post.media_url}
                                            alt="Post"
                                            className="w-16 h-16 object-cover rounded"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {post.caption ? post.caption.slice(0, 60) + '...' : 'No caption'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {post.timestamp && formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </ScrollArea>
                          </>
                        ) : (
                          <div className="text-center p-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No recent posts found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reply Mode</Label>
                <Select
                  value={formData.reply_mode}
                  onValueChange={(value: 'generic' | 'keyword_based' | 'ai') =>
                    setFormData({ ...formData, reply_mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Generic Reply</SelectItem>
                    <SelectItem value="keyword_based">Keyword-Based Reply</SelectItem>
                    <SelectItem value="ai">AI Generated Reply</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.reply_mode === 'generic' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="generic_message">Generic Message *</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertVariable('{{commenter_name}}', genericMessageRef, 'generic_message')}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Name
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertVariable('{{comment_text}}', genericMessageRef, 'generic_message')}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    ref={genericMessageRef}
                    id="generic_message"
                    placeholder="Thank you for your comment, {{commenter_name}}!"
                    value={formData.generic_message}
                    onChange={(e) => setFormData({ ...formData, generic_message: e.target.value })}
                    rows={4}
                  />
                </div>
              ) : formData.reply_mode === 'ai' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      AI replies use your configured API key from Settings → AI Configuration
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ai_prompt">AI Instructions/Prompt *</Label>
                    <Textarea
                      id="ai_prompt"
                      placeholder="You are a friendly customer service representative. Reply to the comment in a helpful and engaging way. Keep responses under 100 words."
                      value={formData.ai_prompt}
                      onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      The AI will receive the comment text and commenter's name. Guide it on tone, length, and what information to include.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Trigger Keywords & Replies *</Label>
                      <Badge variant="outline" className="text-xs">Spintax supported: {"{option1|option2}"}</Badge>
                    </div>
                    {keywordFilters.map((filter, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Filter Set {index + 1}</Label>
                            {keywordFilters.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFilters = keywordFilters.filter((_, i) => i !== index);
                                  setKeywordFilters(newFilters);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Keywords (comma-separated)</Label>
                            <Textarea
                              placeholder="e.g., price, cost, how much"
                              value={filter.keywords}
                              onChange={(e) => {
                                const newFilters = [...keywordFilters];
                                newFilters[index].keywords = e.target.value;
                                setKeywordFilters(newFilters);
                              }}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Match Type</Label>
                            <Select
                              value={filter.matchType}
                              onValueChange={(value: 'exact' | 'contains') => {
                                const newFilters = [...keywordFilters];
                                newFilters[index].matchType = value;
                                setKeywordFilters(newFilters);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contains">Contains (Flexible)</SelectItem>
                                <SelectItem value="exact">Exact Match</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Keyword Reply Message *</Label>
                            <Textarea
                              placeholder="Hi {{commenter_name}}, {thanks|thank you} for asking! The price is {$99|99 dollars}..."
                              value={filter.replyMessage}
                              onChange={(e) => {
                                const newFilters = [...keywordFilters];
                                newFilters[index].replyMessage = e.target.value;
                                setKeywordFilters(newFilters);
                              }}
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use spintax for variations: {"{option1|option2|option3}"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setKeywordFilters([...keywordFilters, { keywords: '', matchType: 'contains', replyMessage: '' }])}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add More Filter
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="no_match_reply_message">No Match Reply (Optional)</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => insertVariable('{{commenter_name}}', noMatchReplyRef, 'no_match_reply_message')}
                        >
                          <User className="h-3 w-3 mr-1" />
                          Name
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      ref={noMatchReplyRef}
                      id="no_match_reply_message"
                      placeholder="{Thank you|Thanks} for your comment, {{commenter_name}}!"
                      value={formData.no_match_reply_message}
                      onChange={(e) => setFormData({ ...formData, no_match_reply_message: e.target.value })}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use spintax for variations: {"{option1|option2|option3}"}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-medium">Send DM for No Match</Label>
                        <p className="text-sm text-muted-foreground">
                          Send a DM when comment doesn't match any keywords
                        </p>
                      </div>
                      <Switch
                        checked={formData.no_match_dm_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, no_match_dm_enabled: checked })}
                      />
                    </div>

                    {formData.no_match_dm_enabled && (
                      <>
                        <div className="space-y-2">
                          <Label>DM Type</Label>
                          <Select
                            value={formData.no_match_dm_type}
                            onValueChange={(value: 'text' | 'flow') =>
                              setFormData({ ...formData, no_match_dm_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Message</SelectItem>
                              <SelectItem value="flow">Flow Template</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.no_match_dm_type === 'text' ? (
                          <div className="space-y-2">
                            <Label htmlFor="no_match_dm_text">DM Message</Label>
                            <Textarea
                              id="no_match_dm_text"
                              placeholder="Hi {{commenter_name}}, {thanks|thank you} for reaching out!"
                              value={formData.no_match_dm_text}
                              onChange={(e) => setFormData({ ...formData, no_match_dm_text: e.target.value })}
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Select Flow Template</Label>
                            <Select
                              value={formData.no_match_dm_flow_id}
                              onValueChange={(value) => setFormData({ ...formData, no_match_dm_flow_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a flow" />
                              </SelectTrigger>
                              <SelectContent>
                                {flows.map((flow) => (
                                  <SelectItem key={flow.id} value={flow.id}>
                                    {flow.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* DM Settings Tab */}
            <TabsContent value="dm" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Send DM After Reply</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a direct message after replying to the comment
                  </p>
                </div>
                <Switch
                  checked={formData.send_dm_after_reply}
                  onCheckedChange={(checked) => setFormData({ ...formData, send_dm_after_reply: checked })}
                />
              </div>

              {formData.send_dm_after_reply && (
                <>
                  <div className="space-y-2">
                    <Label>DM Type</Label>
                    <Select
                      value={formData.dm_message_type}
                      onValueChange={(value: 'text' | 'flow') =>
                        setFormData({ ...formData, dm_message_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Message</SelectItem>
                        <SelectItem value="flow">Flow Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.dm_message_type === 'text' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dm_message_text">DM Message *</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertVariable('{{commenter_name}}', dmMessageRef, 'dm_message_text')}
                          >
                            <User className="h-3 w-3 mr-1" />
                            Name
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertVariable('{{comment_text}}', dmMessageRef, 'dm_message_text')}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Comment
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        ref={dmMessageRef}
                        id="dm_message_text"
                        placeholder="Hi {{commenter_name}}, thanks for your comment!"
                        value={formData.dm_message_text}
                        onChange={(e) => setFormData({ ...formData, dm_message_text: e.target.value })}
                        rows={4}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Select Flow Template</Label>
                      <Select
                        value={formData.dm_flow_id}
                        onValueChange={(value) => setFormData({ ...formData, dm_flow_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a flow" />
                        </SelectTrigger>
                        <SelectContent>
                          {flows.map((flow) => (
                            <SelectItem key={flow.id} value={flow.id}>
                              {flow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The selected flow will be triggered when sending the DM
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dm_delay_seconds">DM Delay (seconds)</Label>
                    <Input
                      id="dm_delay_seconds"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.dm_delay_seconds}
                      onChange={(e) => setFormData({ ...formData, dm_delay_seconds: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Wait time before sending the DM (0 for immediate)
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">DM Conditions</Label>
                    <Select
                      value={formData.dm_condition_type}
                      onValueChange={(value: 'always' | 'keywords' | 'min_length') =>
                        setFormData({ ...formData, dm_condition_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Always Send DM</SelectItem>
                        <SelectItem value="keywords">Only if Keywords Match</SelectItem>
                        <SelectItem value="min_length">Minimum Comment Length</SelectItem>
                      </SelectContent>
                    </Select>

                    {formData.dm_condition_type === 'keywords' && (
                      <div className="space-y-2">
                        <Label htmlFor="dm_condition_keywords">Keywords (comma-separated)</Label>
                        <Textarea
                          id="dm_condition_keywords"
                          placeholder="price, buy, order, purchase"
                          value={formData.dm_condition_keywords}
                          onChange={(e) => setFormData({ ...formData, dm_condition_keywords: e.target.value })}
                          rows={2}
                        />
                      </div>
                    )}

                    {formData.dm_condition_type === 'min_length' && (
                      <div className="space-y-2">
                        <Label htmlFor="dm_condition_min_length">Minimum Comment Length</Label>
                        <Input
                          id="dm_condition_min_length"
                          type="number"
                          min="0"
                          placeholder="10"
                          value={formData.dm_condition_min_length}
                          onChange={(e) => setFormData({ ...formData, dm_condition_min_length: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Moderation Tab */}
            <TabsContent value="moderation" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Spam Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and filter spam comments
                    </p>
                  </div>
                  <Switch
                    checked={formData.spam_detection_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, spam_detection_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Link Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect comments with links
                    </p>
                  </div>
                  <Switch
                    checked={formData.link_detection_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, link_detection_enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profanity Filter Level</Label>
                  <Select
                    value={formData.profanity_level}
                    onValueChange={(value) => setFormData({ ...formData, profanity_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="censored_keywords">Censored Keywords (comma-separated)</Label>
                  <Textarea
                    id="censored_keywords"
                    placeholder="spam, scam, fake"
                    value={formData.censored_keywords}
                    onChange={(e) => setFormData({ ...formData, censored_keywords: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Moderation Action</Label>
                  <Select
                    value={formData.moderation_action}
                    onValueChange={(value) => setFormData({ ...formData, moderation_action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="warn">Warn Only</SelectItem>
                      <SelectItem value="review">Hold for Review</SelectItem>
                      <SelectItem value="hide">Hide Comment</SelectItem>
                      <SelectItem value="delete">Delete Comment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_comment_length">Maximum Comment Length</Label>
                  <Input
                    id="max_comment_length"
                    type="number"
                    placeholder="No limit"
                    value={formData.max_comment_length}
                    onChange={(e) => setFormData({ ...formData, max_comment_length: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whitelist_users">Whitelist Users (comma-separated)</Label>
                  <Textarea
                    id="whitelist_users"
                    placeholder="@user1, @user2, @user3"
                    value={formData.whitelist_users}
                    onChange={(e) => setFormData({ ...formData, whitelist_users: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    These users will always be allowed to comment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blacklist_users">Blacklist Users (comma-separated)</Label>
                  <Textarea
                    id="blacklist_users"
                    placeholder="@spammer1, @bot2, @scam3"
                    value={formData.blacklist_users}
                    onChange={(e) => setFormData({ ...formData, blacklist_users: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    These users will be blocked from triggering automations
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exclude_keywords">Exclude Keywords (comma-separated)</Label>
                <Textarea
                  id="exclude_keywords"
                  placeholder="ad, advertisement, promotion"
                  value={formData.exclude_keywords}
                  onChange={(e) => setFormData({ ...formData, exclude_keywords: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Comments containing these keywords will be ignored
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_comment_length">Minimum Comment Length</Label>
                <Input
                  id="min_comment_length"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.min_comment_length}
                  onChange={(e) => setFormData({ ...formData, min_comment_length: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of characters required in a comment
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Reply to Replies</Label>
                  <p className="text-sm text-muted-foreground">
                    Also trigger automation for replies to comments
                  </p>
                </div>
                <Switch
                  checked={formData.reply_to_replies}
                  onCheckedChange={(checked) => setFormData({ ...formData, reply_to_replies: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="public_reply_message">Public Reply Message (Optional)</Label>
                <Textarea
                  id="public_reply_message"
                  placeholder="Thank you for your comment!"
                  value={formData.public_reply_message}
                  onChange={(e) => setFormData({ ...formData, public_reply_message: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, this message will be posted as a public reply to the comment
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reply History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {replyHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reply history yet</p>
                </div>
              ) : (
                replyHistory.map((reply) => (
                  <Card key={reply.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Comment by {reply.commenter_instagram_id}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {reply.public_reply_sent && (
                            <Badge variant="default">Public Reply</Badge>
                          )}
                          {reply.dm_sent && (
                            <Badge variant="secondary">DM Sent</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Comment:</p>
                        <p className="text-sm text-muted-foreground">{reply.comment_text}</p>
                      </div>
                      {reply.trigger_id && (
                        <div>
                          <p className="text-sm font-medium">Template: {triggers.find(t => t.id === reply.trigger_id)?.name}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Apply Template to Post Dialog */}
      <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Apply Template to Post</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 h-[600px]">
            {/* Left Panel: Template Selection */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a template without a specific post
                </p>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  {keywordTriggers.filter(t => !t.post_id).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No available templates</p>
                      <p className="text-xs mt-2">Create templates without specific posts first</p>
                    </div>
                  ) : (
                    keywordTriggers.filter(t => !t.post_id).map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplateForApply === template.id ? 'border-primary bg-accent' : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedTemplateForApply(template.id)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel: Post Selection */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Post</h3>
                <Select
                  value={postSelectionMode}
                  onValueChange={(value: 'recent' | 'manual') => setPostSelectionMode(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent Posts</SelectItem>
                    <SelectItem value="manual">Manual Entry (Dark Posts/Ads)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {postSelectionMode === 'manual' ? (
                <div className="space-y-2">
                  <Label htmlFor="manual_post_id">Post ID</Label>
                  <Input
                    id="manual_post_id"
                    placeholder="Enter post ID for dark posts or ads"
                    value={selectedPostForApply}
                    onChange={(e) => setSelectedPostForApply(e.target.value)}
                  />
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  {loadingApplyPosts ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : applyTemplatePosts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No posts found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {applyTemplatePosts.map((post) => (
                        <Card
                          key={post.id}
                          className={`cursor-pointer transition-colors ${
                            selectedPostForApply === post.id ? 'border-primary bg-accent' : 'hover:bg-accent'
                          }`}
                          onClick={() => setSelectedPostForApply(post.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              {(post.media_url || post.thumbnail_url) && (
                                <img
                                  src={post.thumbnail_url || post.media_url}
                                  alt="Post"
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {post.caption ? post.caption.slice(0, 60) + '...' : 'No caption'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {post.timestamp && formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApplyTemplateDialog(false);
              setSelectedTemplateForApply('');
              setSelectedPostForApply('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyTemplate}
              disabled={!selectedTemplateForApply || !selectedPostForApply}
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};