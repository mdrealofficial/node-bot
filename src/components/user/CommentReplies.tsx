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

interface CommentReplyTemplate {
  id: string;
  name: string;
  template_type: 'individual_post' | 'full_page';
  is_active: boolean;
  page_id: string;
  post_id?: string;
  censored_keywords?: string[];
  full_page_reply_message?: string;
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
  keyword_filters?: Array<{
    keywords: string[];
    matchType: 'exact' | 'contains';
    replyMessage: string;
  }>;
}

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
}

export function CommentReplies() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CommentReplyTemplate[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommentReplyTemplate | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [replyHistory, setReplyHistory] = useState<any[]>([]);
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<string>('');
  const [selectedPostForApply, setSelectedPostForApply] = useState<string>('');
  const [applyTemplatePosts, setApplyTemplatePosts] = useState<any[]>([]);
  const [loadingApplyPosts, setLoadingApplyPosts] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postSelectionMode, setPostSelectionMode] = useState<'recent' | 'manual'>('recent');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPost, setPreviewPost] = useState<any>(null);
  const [previewComments, setPreviewComments] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [templateStats, setTemplateStats] = useState<Record<string, {
    totalReplies: number;
    successRate: number;
    topKeywords: { keyword: string; count: number }[];
  }>>({});

  // Refs for textarea elements
  const fullPageReplyRef = useRef<HTMLTextAreaElement>(null);
  const genericMessageRef = useRef<HTMLTextAreaElement>(null);
  const keywordReplyRef = useRef<HTMLTextAreaElement>(null);
  const noMatchReplyRef = useRef<HTMLTextAreaElement>(null);
  const dmMessageRef = useRef<HTMLTextAreaElement>(null);

  const [flows, setFlows] = useState<any[]>([]);
  const [keywordFilters, setKeywordFilters] = useState<Array<{ keywords: string; matchType: 'exact' | 'contains'; replyMessage: string }>>([
    { keywords: '', matchType: 'contains', replyMessage: '' }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    template_type: 'individual_post' as 'individual_post' | 'full_page',
    page_id: '',
    post_id: '',
    is_active: true,
    censored_keywords: '',
    full_page_reply_message: '',
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
  });

  useEffect(() => {
    loadPages();
    loadTemplates();
    loadTemplateStats();
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      loadFlows(selectedPageId);
    }
  }, [selectedPageId]);

  // Set first page as selected when pages load
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages]);

  const loadFlows = async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('chatbot_flows')
        .select('id, name, description, is_active')
        .eq('page_id', pageId)
        .eq('is_active', true);
      
      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const loadTemplateStats = async () => {
    try {
      const { data: replies, error } = await supabase
        .from('comment_replies')
        .select('template_id, action_taken, comment_text, created_at')
        .eq('user_id', user?.id);

      if (error) throw error;

      const stats: Record<string, {
        totalReplies: number;
        successRate: number;
        topKeywords: { keyword: string; count: number }[];
      }> = {};

      // Group replies by template
      replies?.forEach((reply) => {
        if (!reply.template_id) return;

        if (!stats[reply.template_id]) {
          stats[reply.template_id] = {
            totalReplies: 0,
            successRate: 0,
            topKeywords: []
          };
        }

        stats[reply.template_id].totalReplies++;
      });

      // Get current templates to access trigger keywords
      const currentTemplates = templates.length > 0 ? templates : (
        await supabase
          .from('comment_reply_templates')
          .select('*')
          .eq('user_id', user?.id)
      ).data || [];

      // Calculate success rate and extract keywords for each template
      for (const templateId in stats) {
        const templateReplies = replies?.filter(r => r.template_id === templateId) || [];
        const successfulReplies = templateReplies.filter(r => r.action_taken === 'replied' || !r.action_taken);
        stats[templateId].successRate = templateReplies.length > 0 
          ? Math.round((successfulReplies.length / templateReplies.length) * 100)
          : 0;

        // Extract keywords from comments
        const keywordCounts: Record<string, number> = {};
        const template = currentTemplates.find((t: any) => t.id === templateId);
        
        if (template?.trigger_keywords) {
          templateReplies.forEach(reply => {
            const commentLower = reply.comment_text?.toLowerCase() || '';
            template.trigger_keywords?.forEach((keyword: string) => {
              if (commentLower.includes(keyword.toLowerCase())) {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
              }
            });
          });

          stats[templateId].topKeywords = Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([keyword, count]) => ({ keyword, count }));
        }
      }

      setTemplateStats(stats);
    } catch (error: any) {
      console.error('Failed to load template stats:', error);
    }
  };


  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_pages')
        .select('id, page_name, page_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast.error('Failed to load pages');
      console.error(error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comment_reply_templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as any as CommentReplyTemplate[]);
      
      // Reload stats after templates are loaded
      await loadTemplateStats();
    } catch (error: any) {
      toast.error('Failed to load templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPosts = async (pageId: string, cursor?: string, direction?: 'next' | 'prev') => {
    if (!pageId) return;
    
    try {
      setLoadingPosts(true);
      const page = pages.find(p => p.id === pageId);
      if (!page) {
        console.log('Page not found');
        return;
      }

      const { data: pageData, error: pageError } = await supabase
        .from('facebook_pages')
        .select('page_id, page_access_token')
        .eq('id', pageId)
        .single();

      if (pageError || !pageData) {
        console.error('Failed to get page data:', pageError);
        toast.error('Failed to load page data');
        return;
      }

      console.log('Fetching posts for page:', pageData.page_id);

      // Build URL with pagination cursor if provided
      let url = `https://graph.facebook.com/v21.0/${pageData.page_id}/posts?fields=id,message,created_time,full_picture&limit=10&access_token=${pageData.page_access_token}`;
      
      if (cursor) {
        url += `&${direction === 'next' ? 'after' : 'before'}=${cursor}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook API error:', errorData);
        toast.error(`Failed to fetch posts: ${errorData.error?.message || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      console.log('Facebook API response:', data);
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} posts`);
        setRecentPosts(data.data);
        
        // Store pagination cursors
        if (data.paging?.cursors) {
          setNextCursor(data.paging.cursors.after || null);
          setPreviousCursor(data.paging.cursors.before || null);
        } else {
          setNextCursor(null);
          setPreviousCursor(null);
        }
        
        // Update page counter
        if (direction === 'next') {
          setCurrentPage(prev => prev + 1);
        } else if (direction === 'prev') {
          setCurrentPage(prev => Math.max(1, prev - 1));
        } else if (!cursor) {
          setCurrentPage(1);
        }
      } else {
        console.log('No posts in response');
        setRecentPosts([]);
        setNextCursor(null);
        setPreviousCursor(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch recent posts:', error);
      toast.error('Failed to fetch recent posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchPostPreview = async (postId: string) => {
    try {
      setLoadingPreview(true);
      
      const page = pages.find(p => p.id === formData.page_id);
      if (!page) return;

      const { data: pageData } = await supabase
        .from('facebook_pages')
        .select('page_id, page_access_token')
        .eq('id', formData.page_id)
        .single();

      if (!pageData) return;

      // Fetch post details
      const postResponse = await fetch(
        `https://graph.facebook.com/v21.0/${postId}?fields=id,message,created_time,full_picture&access_token=${pageData.page_access_token}`
      );
      const postData = await postResponse.json();
      setPreviewPost(postData);

      // Fetch comments
      const commentsResponse = await fetch(
        `https://graph.facebook.com/v21.0/${postId}/comments?fields=id,message,created_time,from&limit=10&access_token=${pageData.page_access_token}`
      );
      const commentsData = await commentsResponse.json();
      setPreviewComments(commentsData.data || []);

      setShowPreviewModal(true);
    } catch (error: any) {
      console.error('Failed to fetch post preview:', error);
      toast.error('Failed to load post preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadReplyHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false})
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
    if (!selectedPageId) return;
    
    try {
      setLoadingApplyPosts(true);
      const page = pages.find(p => p.id === selectedPageId);
      if (!page) return;

      const { data: pageData } = await supabase
        .from('facebook_pages')
        .select('page_id, page_access_token')
        .eq('id', selectedPageId)
        .single();

      if (!pageData) return;

      const url = `https://graph.facebook.com/v21.0/${pageData.page_id}/posts?fields=id,message,created_time,full_picture&limit=20&access_token=${pageData.page_access_token}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        toast.error('Failed to fetch posts');
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
      const template = templates.find(t => t.id === selectedTemplateForApply);
      if (!template) {
        toast.error('Template not found');
        return;
      }

      // Create a new individual post template based on the selected template
      const { error } = await supabase
        .from('comment_reply_templates')
        .insert({
          user_id: user?.id,
          name: `${template.name} - Applied`,
          template_type: 'individual_post',
          page_id: selectedPageId,
          post_id: selectedPostForApply,
          is_active: true,
          reply_mode: template.reply_mode,
          generic_message: template.generic_message,
          trigger_keywords: template.trigger_keywords,
          match_type: template.match_type,
          keyword_reply_message: template.keyword_reply_message,
          no_match_reply_message: template.no_match_reply_message,
          exclude_keywords: template.exclude_keywords,
          min_comment_length: template.min_comment_length,
          max_comment_length: template.max_comment_length,
          reply_to_replies: template.reply_to_replies,
          send_dm_after_reply: template.send_dm_after_reply,
          dm_message_text: template.dm_message_text,
          dm_delay_seconds: template.dm_delay_seconds,
          dm_conditions: template.dm_conditions,
          profanity_level: template.profanity_level,
          spam_detection_enabled: template.spam_detection_enabled,
          link_detection_enabled: template.link_detection_enabled,
          moderation_action: template.moderation_action,
          whitelist_users: template.whitelist_users,
          blacklist_users: template.blacklist_users,
          censored_keywords: template.censored_keywords,
        });

      if (error) throw error;

      toast.success('Template applied to post successfully');
      setShowApplyTemplateDialog(false);
      setSelectedTemplateForApply('');
      setSelectedPostForApply('');
      loadTemplates();
    } catch (error: any) {
      toast.error('Failed to apply template');
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.page_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      const templateData: any = {
        user_id: user?.id,
        name: formData.name,
        template_type: formData.template_type,
        page_id: formData.page_id,
        is_active: formData.is_active,
        send_dm_after_reply: formData.send_dm_after_reply,
        dm_message_text: formData.send_dm_after_reply ? formData.dm_message_text : null,
        dm_delay_seconds: formData.send_dm_after_reply ? formData.dm_delay_seconds : 0,
        dm_conditions: formData.send_dm_after_reply ? (() => {
          if (formData.dm_condition_type === 'keywords') {
            return {
              keywords: formData.dm_condition_keywords
                .split(',')
                .map(k => k.trim())
                .filter(k => k)
            };
          } else if (formData.dm_condition_type === 'min_length') {
            return { min_comment_length: formData.dm_condition_min_length };
          } else {
            return { always: true };
          }
        })() : { always: true },
        profanity_level: formData.profanity_level,
        spam_detection_enabled: formData.spam_detection_enabled,
        link_detection_enabled: formData.link_detection_enabled,
        moderation_action: formData.moderation_action,
        whitelist_users: formData.whitelist_users
          .split(',')
          .map(u => u.trim())
          .filter(u => u),
        blacklist_users: formData.blacklist_users
          .split(',')
          .map(u => u.trim())
          .filter(u => u),
      };

              // Both individual_post and full_page templates support all features
      templateData.reply_mode = formData.reply_mode;
      
      if (formData.reply_mode === 'generic') {
        templateData.generic_message = formData.generic_message;
      } else if (formData.reply_mode === 'ai') {
        templateData.ai_enabled = formData.ai_enabled;
        templateData.ai_prompt = formData.ai_prompt;
      } else {
        // Store all filter sets in the new keyword_filters JSONB column
        const validFilters = keywordFilters
          .filter(filter => filter.keywords.trim())
          .map(filter => ({
            keywords: filter.keywords.split(',').map(k => k.trim()).filter(k => k),
            matchType: filter.matchType,
            replyMessage: filter.replyMessage
          }));

        templateData.keyword_filters = validFilters;

        // For backward compatibility, also populate old columns with first filter
        if (validFilters.length > 0) {
          templateData.trigger_keywords = validFilters[0].keywords;
          templateData.match_type = validFilters[0].matchType;
          templateData.keyword_reply_message = validFilters[0].replyMessage;
        }
        templateData.no_match_reply_message = formData.no_match_reply_message;
      }
      
      templateData.exclude_keywords = formData.exclude_keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
      templateData.min_comment_length = formData.min_comment_length || 0;
      templateData.max_comment_length = formData.max_comment_length ? parseInt(formData.max_comment_length) : null;
      templateData.reply_to_replies = formData.reply_to_replies;
      templateData.censored_keywords = formData.censored_keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
      
      // Only set post_id for individual_post templates
      if (formData.template_type === 'individual_post') {
        templateData.post_id = formData.post_id;
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('comment_reply_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('comment_reply_templates')
          .insert(templateData);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      setShowDialog(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save template';
      toast.error(errorMessage);
      console.error('Save template error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.template_type === 'full_page') {
      toast.error('Full page templates cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('comment_reply_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error: any) {
      toast.error('Failed to delete template');
      console.error(error);
    }
  };

  const handleEdit = (template: CommentReplyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      page_id: template.page_id,
      post_id: template.post_id || '',
      is_active: template.is_active,
      censored_keywords: template.censored_keywords?.join(', ') || '',
      full_page_reply_message: template.full_page_reply_message || '',
      reply_mode: template.reply_mode || 'generic',
      generic_message: template.generic_message || '',
      trigger_keywords: template.trigger_keywords?.join(', ') || '',
      match_type: template.match_type || 'contains',
      keyword_reply_message: template.keyword_reply_message || '',
      no_match_reply_message: template.no_match_reply_message || '',
      exclude_keywords: template.exclude_keywords?.join(', ') || '',
      min_comment_length: template.min_comment_length || 0,
      max_comment_length: template.max_comment_length?.toString() || '',
      reply_to_replies: template.reply_to_replies || false,
      send_dm_after_reply: template.send_dm_after_reply || false,
      dm_message_type: 'text' as 'text' | 'flow',
      dm_message_text: template.dm_message_text || '',
      dm_flow_id: '',
      dm_delay_seconds: template.dm_delay_seconds || 0,
      dm_condition_type: (template.dm_conditions?.always ? 'always' : 
                         template.dm_conditions?.keywords ? 'keywords' : 'min_length') as 'always' | 'keywords' | 'min_length',
      dm_condition_keywords: template.dm_conditions?.keywords?.join(', ') || '',
      dm_condition_min_length: template.dm_conditions?.min_comment_length || 0,
      no_match_dm_enabled: false,
      no_match_dm_type: 'text' as 'text' | 'flow',
      no_match_dm_text: '',
      no_match_dm_flow_id: '',
      profanity_level: template.profanity_level || 'none',
      spam_detection_enabled: template.spam_detection_enabled || false,
      link_detection_enabled: template.link_detection_enabled || false,
      moderation_action: template.moderation_action || 'none',
      whitelist_users: template.whitelist_users?.join(', ') || '',
      blacklist_users: template.blacklist_users?.join(', ') || '',
      ai_enabled: template.ai_enabled || false,
      ai_prompt: template.ai_prompt || '',
    });
    
    // Populate keywordFilters from database - prefer new keyword_filters column
    if (template.keyword_filters && Array.isArray(template.keyword_filters) && template.keyword_filters.length > 0) {
      setKeywordFilters(template.keyword_filters.map((filter: any) => ({
        keywords: Array.isArray(filter.keywords) ? filter.keywords.join(', ') : filter.keywords,
        matchType: filter.matchType || 'contains',
        replyMessage: filter.replyMessage || ''
      })));
    } else if (template.trigger_keywords && template.trigger_keywords.length > 0) {
      // Fallback to old columns for backward compatibility
      setKeywordFilters([{
        keywords: template.trigger_keywords.join(', '),
        matchType: template.match_type || 'contains',
        replyMessage: template.keyword_reply_message || '',
      }]);
    } else {
      setKeywordFilters([{ keywords: '', matchType: 'contains', replyMessage: '' }]);
    }
    
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      template_type: 'individual_post',
      page_id: selectedPageId,
      post_id: '',
      is_active: true,
      censored_keywords: '',
      full_page_reply_message: '',
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
    });
    setEditingTemplate(null);
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

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'individual_post':
        return 'Individual Post';
      case 'full_page':
        return 'Full Page';
      case 'general':
        return 'General';
      default:
        return type;
    }
  };

  const getPageName = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    return page?.page_name || 'Unknown Page';
  };

  const toggleTemplateStatus = async (template: CommentReplyTemplate) => {
    try {
      const { error } = await supabase
        .from('comment_reply_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      
      toast.success(`Template ${!template.is_active ? 'activated' : 'deactivated'}`);
      loadTemplates();
    } catch (error: any) {
      toast.error('Failed to update template status');
      console.error(error);
    }
  };

  // Filter templates by selected page
  const filteredTemplates = templates.filter(t => t.page_id === selectedPageId);
  
  // Separate templates by type
  const fullPageTemplates = filteredTemplates.filter(t => t.template_type === 'full_page');
  const individualPostTemplates = filteredTemplates.filter(t => t.template_type === 'individual_post');

  return (
    <div className="space-y-6">
      {/* Page Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-base font-medium">Select page</Label>
            <div className="w-80">
              {pages.length === 0 ? (
                <p className="text-muted-foreground text-sm">No Facebook pages connected. Please connect a page first.</p>
              ) : (
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Facebook page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.page_name}
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
              disabled={!selectedPageId}
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
      ) : !selectedPageId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a page</h3>
            <p className="text-muted-foreground text-center">
              Choose a Facebook page to view its automation templates
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
            <TabsTrigger value="templates">
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
                {individualPostTemplates.filter(t => t.is_active).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No active post automations yet. Enable templates from the Templates tab.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {individualPostTemplates.filter(t => t.is_active).map((template) => {
                      const stats = templateStats[template.id];
                      return (
                        <Card key={template.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{template.name}</CardTitle>
                                  <Badge variant="default">Active</Badge>
                                  {template.post_id && (
                                    <Badge variant="outline">Post: {template.post_id.slice(0, 15)}...</Badge>
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
                                  onClick={() => toggleTemplateStatus(template)}
                                  title="Disable"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {template.reply_mode === 'keyword_based' && template.trigger_keywords && template.trigger_keywords.length > 0 && (
                                <div>
                                  <span className="font-medium">Trigger Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.trigger_keywords.map((keyword, idx) => (
                                      <Badge key={idx} variant="secondary">{keyword}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {template.keyword_reply_message && (
                                <div>
                                  <span className="font-medium">Reply:</span>
                                  <p className="text-muted-foreground mt-1">{template.keyword_reply_message}</p>
                                </div>
                              )}
                              {template.send_dm_after_reply && (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Send className="h-4 w-4" />
                                  <span>DM automation enabled</span>
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
          <TabsContent value="templates" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Individual Post Reply Templates</CardTitle>
                    <CardDescription>
                      Create templates for specific posts. These override the global template for selected posts.
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    resetForm();
                    setFormData(prev => ({ 
                      ...prev, 
                      page_id: selectedPageId,
                      template_type: 'individual_post'
                    }));
                    if (selectedPageId) {
                      fetchRecentPosts(selectedPageId);
                    }
                    setShowDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Individual Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {individualPostTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No individual templates yet</h3>
                    <p className="text-muted-foreground text-center">
                      Create templates for specific posts to override the global reply settings
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {individualPostTemplates.map((template) => {
                      const stats = templateStats[template.id];
                      return (
                        <Card key={template.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle>{template.name}</CardTitle>
                                  <Badge variant={template.is_active ? "default" : "secondary"}>
                                    {template.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getTemplateTypeLabel(template.template_type)}
                                  </Badge>
                                  {template.spam_detection_enabled && (
                                    <Badge variant="outline" className="bg-orange-50">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Spam Detection
                                    </Badge>
                                  )}
                                  {template.profanity_level && template.profanity_level !== 'none' && (
                                    <Badge variant="outline" className="bg-red-50">
                                      Profanity Filter: {template.profanity_level}
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  Page: {getPageName(template.page_id)}
                                  {template.post_id && ` • Post: ${template.post_id}`}
                                </CardDescription>
                                {stats && (
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>📊 {stats.totalReplies} replies</span>
                                    <span>✅ {stats.successRate}% success rate</span>
                                    {stats.topKeywords.length > 0 && (
                                      <span>
                                        🔑 Top: {stats.topKeywords.map(k => `${k.keyword} (${k.count})`).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleTemplateStatus(template)}
                                >
                                  {template.is_active ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {template.template_type === 'full_page' && template.full_page_reply_message && (
                                <div>
                                  <span className="font-medium">Reply Message:</span>
                                  <p className="text-muted-foreground mt-1">{template.full_page_reply_message}</p>
                                </div>
                              )}
                              {template.template_type !== 'full_page' && (
                                <>
                                  {template.reply_mode === 'generic' && template.generic_message && (
                                    <div>
                                      <span className="font-medium">Generic Message:</span>
                                      <p className="text-muted-foreground mt-1">{template.generic_message}</p>
                                    </div>
                                  )}
                                  {template.reply_mode === 'keyword_based' && (
                                    <>
                                      {template.trigger_keywords && template.trigger_keywords.length > 0 && (
                                        <div>
                                          <span className="font-medium">Trigger Keywords:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {template.trigger_keywords.map((keyword, idx) => (
                                              <Badge key={idx} variant="secondary">{keyword}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {template.keyword_reply_message && (
                                        <div>
                                          <span className="font-medium">Keyword Reply:</span>
                                          <p className="text-muted-foreground mt-1">{template.keyword_reply_message}</p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                              {template.censored_keywords && template.censored_keywords.length > 0 && (
                                <div>
                                  <span className="font-medium">Censored Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.censored_keywords.map((keyword, idx) => (
                                      <Badge key={idx} variant="destructive">{keyword}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {template.send_dm_after_reply && (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Send className="h-4 w-4" />
                                  <span>DM automation enabled</span>
                                  {template.dm_delay_seconds && template.dm_delay_seconds > 0 && (
                                    <span className="text-muted-foreground">
                                      (delay: {template.dm_delay_seconds}s)
                                    </span>
                                  )}
                                </div>
                              )}
                              {template.moderation_action && template.moderation_action !== 'none' && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <Shield className="h-4 w-4" />
                                  <span>Moderation: {template.moderation_action}</span>
                                </div>
                              )}
                              {template.whitelist_users && template.whitelist_users.length > 0 && (
                                <div>
                                  <span className="font-medium text-green-600">Whitelisted Users:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.whitelist_users.map((user, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-green-50">{user}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {template.blacklist_users && template.blacklist_users.length > 0 && (
                                <div>
                                  <span className="font-medium text-red-600">Blacklisted Users:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.blacklist_users.map((user, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-red-50">{user}</Badge>
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

          {/* Tab 3: Global Settings (Full Page Template) */}
          <TabsContent value="global" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Full Page Reply Template</CardTitle>
                <CardDescription>
                  One template that applies to all posts on this page (except posts with individual templates)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fullPageTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No global template</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create a full page reply template to apply to all posts
                    </p>
                    <Button onClick={async () => {
                      // Create the full page template automatically
                      try {
                        const { data, error } = await supabase
                          .from('comment_reply_templates')
                          .insert({
                            user_id: user?.id,
                            name: 'Full Page Auto-Reply',
                            template_type: 'full_page',
                            page_id: selectedPageId,
                            is_active: false,
                            full_page_reply_message: 'Thank you for your comment!',
                          })
                          .select()
                          .single();

                        if (error) throw error;
                        toast.success('Full page template created');
                        loadTemplates();
                      } catch (error: any) {
                        toast.error('Failed to create template');
                        console.error(error);
                      }
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Full Page Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {fullPageTemplates.map((template) => {
                      const stats = templateStats[template.id];
                      return (
                        <Card key={template.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle>{template.name}</CardTitle>
                                  <Badge variant={template.is_active ? "default" : "secondary"}>
                                    {template.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline">All Posts</Badge>
                                  {template.spam_detection_enabled && (
                                    <Badge variant="outline" className="bg-orange-50">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Spam Detection
                                    </Badge>
                                  )}
                                  {template.profanity_level && template.profanity_level !== 'none' && (
                                    <Badge variant="outline" className="bg-red-50">
                                      Profanity Filter: {template.profanity_level}
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  Page: {getPageName(template.page_id)}
                                </CardDescription>
                                {stats && (
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>📊 {stats.totalReplies} replies</span>
                                    <span>✅ {stats.successRate}% success rate</span>
                                    {stats.topKeywords.length > 0 && (
                                      <span>
                                        🔑 Top: {stats.topKeywords.map(k => `${k.keyword} (${k.count})`).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleTemplateStatus(template)}
                                  title={template.is_active ? "Disable" : "Enable"}
                                >
                                  {template.is_active ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(template)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {/* Show reply mode badge */}
                              {template.reply_mode && (
                                <div>
                                  <span className="font-medium">Reply Mode: </span>
                                  <Badge variant="outline">
                                    {template.reply_mode === 'generic' && 'Generic Reply'}
                                    {template.reply_mode === 'keyword_based' && 'Keyword-Based'}
                                    {template.reply_mode === 'ai' && 'AI Generated'}
                                  </Badge>
                                </div>
                              )}
                              
                              {/* Show content based on reply mode */}
                              {template.reply_mode === 'generic' && template.generic_message && (
                                <div>
                                  <span className="font-medium">Generic Message:</span>
                                  <p className="text-muted-foreground mt-1">{template.generic_message}</p>
                                </div>
                              )}
                              {template.reply_mode === 'ai' && template.ai_prompt && (
                                <div>
                                  <span className="font-medium">AI Prompt:</span>
                                  <p className="text-muted-foreground mt-1">{template.ai_prompt}</p>
                                </div>
                              )}
                              {template.reply_mode === 'keyword_based' && (
                                <>
                                  {template.keyword_filters && Array.isArray(template.keyword_filters) && template.keyword_filters.length > 0 && (
                                    <div>
                                      <span className="font-medium">Keyword Filters: {template.keyword_filters.length} set(s)</span>
                                      <div className="mt-1 text-muted-foreground text-xs">
                                        Multiple keyword filter sets configured
                                      </div>
                                    </div>
                                  )}
                                  {template.trigger_keywords && template.trigger_keywords.length > 0 && (
                                    <div>
                                      <span className="font-medium">Trigger Keywords:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {template.trigger_keywords.map((keyword, idx) => (
                                          <Badge key={idx} variant="secondary">{keyword}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              {template.censored_keywords && template.censored_keywords.length > 0 && (
                                <div>
                                  <span className="font-medium">Censored Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.censored_keywords.map((keyword, idx) => (
                                      <Badge key={idx} variant="destructive">{keyword}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {template.send_dm_after_reply && (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Send className="h-4 w-4" />
                                  <span>DM automation enabled</span>
                                  {template.dm_delay_seconds && template.dm_delay_seconds > 0 && (
                                    <span className="text-muted-foreground">
                                      (delay: {template.dm_delay_seconds}s)
                                    </span>
                                  )}
                                </div>
                              )}
                              {template.moderation_action && template.moderation_action !== 'none' && (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <Shield className="h-4 w-4" />
                                  <span>Moderation: {template.moderation_action}</span>
                                </div>
                              )}
                              {template.whitelist_users && template.whitelist_users.length > 0 && (
                                <div>
                                  <span className="font-medium text-green-600">Whitelisted Users:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.whitelist_users.map((user, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-green-50">{user}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {template.blacklist_users && template.blacklist_users.length > 0 && (
                                <div>
                                  <span className="font-medium text-red-600">Blacklisted Users:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.blacklist_users.map((user, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-red-50">{user}</Badge>
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
        </Tabs>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Comment Reply Template' : 'Create Comment Reply Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="dm">DM Automation</TabsTrigger>
                <TabsTrigger value="moderation">Moderation</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Welcome Message"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {formData.template_type === 'individual_post' && formData.page_id && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Post (Optional)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPostSelectionMode('recent')}
                        >
                          <List className="h-4 w-4 mr-1" />
                          Recent Posts
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPostSelectionMode('manual')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Manual Entry
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Leave empty to apply to all posts, or select/enter a specific post ID. Manual entry supports dark posts (page ads).
                    </p>

                    {postSelectionMode === 'manual' ? (
                      <Input
                        placeholder="Enter post ID (supports dark posts/ads)"
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
                              <div className="space-y-2">
                                {recentPosts.map((post) => (
                                  <div
                                    key={post.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      formData.post_id === post.id
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:border-primary/50'
                                    }`}
                                    onClick={() => setFormData({ ...formData, post_id: post.id })}
                                  >
                                    <div className="flex gap-3">
                                      {post.full_picture && (
                                        <img
                                          src={post.full_picture}
                                          alt="Post"
                                          className="w-16 h-16 object-cover rounded"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm line-clamp-2">
                                          {post.message || 'No message'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(post.created_time).toLocaleDateString()}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              fetchPostPreview(post.id);
                                            }}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Preview
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="flex items-center justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fetchRecentPosts(formData.page_id, previousCursor, 'prev')}
                                disabled={!previousCursor || currentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                Page {currentPage}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fetchRecentPosts(formData.page_id, nextCursor, 'next')}
                                disabled={!nextCursor}
                              >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
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
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                {/* Reply mode selection - available for both individual_post and full_page */}
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
                          onChange={(e) =>
                            setFormData({ ...formData, generic_message: e.target.value })
                          }
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
                            onChange={(e) =>
                              setFormData({ ...formData, ai_prompt: e.target.value })
                            }
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
                            onChange={(e) =>
                              setFormData({ ...formData, no_match_reply_message: e.target.value })
                            }
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
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, no_match_dm_enabled: checked })
                              }
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
                                    onChange={(e) =>
                                      setFormData({ ...formData, no_match_dm_text: e.target.value })
                                    }
                                    rows={3}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Use spintax for variations: {"{option1|option2|option3}"}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label htmlFor="no_match_dm_flow_id">Select Flow Template</Label>
                                  <Select
                                    value={formData.no_match_dm_flow_id}
                                    onValueChange={(value) =>
                                      setFormData({ ...formData, no_match_dm_flow_id: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a flow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {flows.length > 0 ? (
                                        flows.map((flow) => (
                                          <SelectItem key={flow.id} value={flow.id}>
                                            {flow.name}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-flows" disabled>
                                          No flows available for this page
                                        </SelectItem>
                                      )}
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

              <TabsContent value="dm" className="space-y-4">
                {/* DM settings work for both individual_post and full_page templates */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Send DM After Reply</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send a direct message after replying to a comment
                    </p>
                  </div>
                  <Switch
                    checked={formData.send_dm_after_reply}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, send_dm_after_reply: checked })
                    }
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
                          placeholder="Hi {{commenter_name}}, thank you for your interest!"
                          value={formData.dm_message_text}
                          onChange={(e) =>
                            setFormData({ ...formData, dm_message_text: e.target.value })
                          }
                          rows={4}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="dm_flow_id">Select Flow Template *</Label>
                        <Select
                          value={formData.dm_flow_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, dm_flow_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a flow" />
                          </SelectTrigger>
                          <SelectContent>
                            {flows.length > 0 ? (
                              flows.map((flow) => (
                                <SelectItem key={flow.id} value={flow.id}>
                                  {flow.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-flows" disabled>
                                No flows available for this page
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {flows.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Create a flow first to use it as a DM template
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="dm_delay_seconds">Delay Before Sending (seconds)</Label>
                      <Input
                        id="dm_delay_seconds"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.dm_delay_seconds}
                        onChange={(e) =>
                          setFormData({ ...formData, dm_delay_seconds: parseInt(e.target.value) || 0 })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Wait this many seconds after replying before sending the DM
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>DM Condition</Label>
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
                          <SelectItem value="keywords">Only if Comment Contains Keywords</SelectItem>
                          <SelectItem value="min_length">Only if Comment Length Exceeds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.dm_condition_type === 'keywords' && (
                      <div className="space-y-2">
                        <Label htmlFor="dm_condition_keywords">DM Trigger Keywords (comma-separated)</Label>
                        <Textarea
                          id="dm_condition_keywords"
                          placeholder="e.g., interested, more info, details"
                          value={formData.dm_condition_keywords}
                          onChange={(e) =>
                            setFormData({ ...formData, dm_condition_keywords: e.target.value })
                          }
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
                          placeholder="50"
                          value={formData.dm_condition_min_length}
                          onChange={(e) =>
                            setFormData({ ...formData, dm_condition_min_length: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="moderation" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Spam Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        AI-powered detection of spam and repetitive comments
                      </p>
                    </div>
                    <Switch
                      checked={formData.spam_detection_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, spam_detection_enabled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Link Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        Block comments containing suspicious links
                      </p>
                    </div>
                    <Switch
                      checked={formData.link_detection_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, link_detection_enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Profanity Filter Level</Label>
                    <Select
                      value={formData.profanity_level}
                      onValueChange={(value) =>
                        setFormData({ ...formData, profanity_level: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select filter level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None - Allow all language</SelectItem>
                        <SelectItem value="mild">Mild - Block obvious profanity</SelectItem>
                        <SelectItem value="moderate">Moderate - Standard filter</SelectItem>
                        <SelectItem value="severe">Severe - Strict filtering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Censored Keywords (comma-separated)</Label>
                    <Textarea
                      placeholder="e.g., spam, scam, fake"
                      value={formData.censored_keywords}
                      onChange={(e) =>
                        setFormData({ ...formData, censored_keywords: e.target.value })
                      }
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comments containing these keywords will be flagged
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Moderation Action</Label>
                    <Select
                      value={formData.moderation_action}
                      onValueChange={(value) =>
                        setFormData({ ...formData, moderation_action: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None - Only log violations</SelectItem>
                        <SelectItem value="hide">Hide - Hide comment from public</SelectItem>
                        <SelectItem value="warn">Warn - Send warning message</SelectItem>
                        <SelectItem value="review">Review - Flag for manual review</SelectItem>
                        <SelectItem value="delete">Delete - Remove comment</SelectItem>
                        <SelectItem value="ban">Ban - Block user from commenting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Comment Length (characters)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 500"
                      value={formData.max_comment_length}
                      onChange={(e) =>
                        setFormData({ ...formData, max_comment_length: e.target.value })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Comments exceeding this length may be flagged as spam
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Whitelist Users (comma-separated usernames or IDs)</Label>
                    <Textarea
                      placeholder="e.g., trusted_user, verified_customer"
                      value={formData.whitelist_users}
                      onChange={(e) =>
                        setFormData({ ...formData, whitelist_users: e.target.value })
                      }
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      These users will bypass all moderation filters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Blacklist Users (comma-separated usernames or IDs)</Label>
                    <Textarea
                      placeholder="e.g., spammer123, troll_account"
                      value={formData.blacklist_users}
                      onChange={(e) =>
                        setFormData({ ...formData, blacklist_users: e.target.value })
                      }
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      These users will be automatically blocked
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {/* Advanced settings work for both individual_post and full_page templates */}
                <div className="space-y-2">
                  <Label htmlFor="exclude_keywords">Exclude Keywords (comma-separated)</Label>
                  <Textarea
                    id="exclude_keywords"
                    placeholder="e.g., spam, fake, scam"
                    value={formData.exclude_keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, exclude_keywords: e.target.value })
                    }
                    rows={2}
                  />
                  <p className="text-sm text-muted-foreground">
                    Don't reply to comments containing these keywords
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
                    onChange={(e) =>
                      setFormData({ ...formData, min_comment_length: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Only reply to comments with at least this many characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_comment_length">Maximum Comment Length</Label>
                  <Input
                    id="max_comment_length"
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.max_comment_length}
                    onChange={(e) =>
                      setFormData({ ...formData, max_comment_length: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Only reply to comments shorter than this (leave empty for unlimited)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="reply_to_replies">Reply to Replies</Label>
                    <p className="text-sm text-muted-foreground">
                      Also reply to comments that are replies to other comments
                    </p>
                  </div>
                  <Switch
                    id="reply_to_replies"
                    checked={formData.reply_to_replies}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, reply_to_replies: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whitelist_users">Whitelist Users (comma-separated usernames or IDs)</Label>
                  <Textarea
                    id="whitelist_users"
                    placeholder="e.g., preferred_customer, vip_user"
                    value={formData.whitelist_users}
                    onChange={(e) =>
                      setFormData({ ...formData, whitelist_users: e.target.value })
                    }
                    rows={2}
                  />
                  <p className="text-sm text-muted-foreground">
                    Only these users can trigger the automation (leave empty for all users)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blacklist_users">Blacklist Users (comma-separated usernames or IDs)</Label>
                  <Textarea
                    id="blacklist_users"
                    placeholder="e.g., spam_account, troll_user"
                    value={formData.blacklist_users}
                    onChange={(e) =>
                      setFormData({ ...formData, blacklist_users: e.target.value })
                    }
                    rows={2}
                  />
                  <p className="text-sm text-muted-foreground">
                    These users will be ignored by the automation
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reply History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {replyHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reply history yet</p>
                </div>
              ) : (
                replyHistory.map((reply) => (
                  <Card key={reply.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Comment: {reply.comment_text}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Reply: {reply.reply_text}
                            </p>
                          </div>
                          <Badge variant={reply.action_taken === 'replied' ? 'default' : 'secondary'}>
                            {reply.action_taken || 'replied'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                          {reply.template_id && (
                            <span>
                              Template: {templates.find(t => t.id === reply.template_id)?.name || 'Unknown'}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewPost ? (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {previewPost.full_picture && (
                      <img
                        src={previewPost.full_picture}
                        alt="Post"
                        className="w-full rounded-lg mb-4"
                      />
                    )}
                    <p className="text-sm">{previewPost.message || 'No message'}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(previewPost.created_time).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h3 className="font-semibold">Recent Comments ({previewComments.length})</h3>
                  {previewComments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  ) : (
                    previewComments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{comment.from?.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {comment.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(comment.created_time), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Apply Template to Post Dialog */}
      <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Apply Template to Post</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Template List */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Select Template</Label>
                <p className="text-sm text-muted-foreground">Choose a template to apply</p>
              </div>
              <ScrollArea className="h-[50vh] border rounded-md p-4">
                <div className="space-y-2">
                  {templates.filter(t => t.page_id === selectedPageId && t.template_type === 'individual_post').length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No templates available for this page
                    </p>
                  ) : (
                    templates
                      .filter(t => t.page_id === selectedPageId && t.template_type === 'individual_post')
                      .map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-colors ${
                            selectedTemplateForApply === template.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTemplateForApply(template.id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{template.name}</p>
                                <Badge variant={template.is_active ? "default" : "secondary"}>
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {template.reply_mode === 'generic' && template.generic_message && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {template.generic_message}
                                </p>
                              )}
                              {template.reply_mode === 'keyword_based' && template.trigger_keywords && (
                                <div className="flex flex-wrap gap-1">
                                  {template.trigger_keywords.slice(0, 3).map((keyword, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                  {template.trigger_keywords.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{template.trigger_keywords.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Post List */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Select Post</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPostSelectionMode('recent');
                        setSelectedPostForApply('');
                      }}
                    >
                      <List className="h-4 w-4 mr-1" />
                      Recent Posts
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPostSelectionMode('manual');
                        setSelectedPostForApply('');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Manual Entry
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {postSelectionMode === 'manual' 
                    ? 'Enter a post ID (supports dark posts/ads)'
                    : 'Choose from your recent posts'
                  }
                </p>
              </div>

              {postSelectionMode === 'manual' ? (
                <div className="space-y-2 p-4 border rounded-md">
                  <Input
                    placeholder="Enter post ID (e.g., 106672191026107_1416663540030561)"
                    value={selectedPostForApply}
                    onChange={(e) => setSelectedPostForApply(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the full post ID here. This works for regular posts and dark posts (Facebook ads).
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[50vh] border rounded-md p-4">
                {loadingApplyPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : applyTemplatePosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No posts available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {applyTemplatePosts.map((post) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer transition-colors ${
                          selectedPostForApply === post.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedPostForApply(post.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {post.full_picture && (
                              <img
                                src={post.full_picture}
                                alt="Post"
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">
                                {post.message || 'No message'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(post.created_time).toLocaleDateString()}
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApplyTemplateDialog(false);
                setSelectedTemplateForApply('');
                setSelectedPostForApply('');
              }}
            >
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
}
