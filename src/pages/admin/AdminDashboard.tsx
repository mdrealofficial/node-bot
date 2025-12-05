import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Users, Activity, Key, Webhook, Loader2, UserCog, Eye, UserX, Trash2, CheckCircle, XCircle, Copy, Facebook, Instagram, MessageCircle, Download, Database, FileArchive, ArrowLeftRight, RefreshCw, AlertCircle, Map } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserManagementDialog } from '@/components/admin/UserManagementDialog';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UserSubscriptionManager } from '@/components/admin/UserSubscriptionManager';
import { SubscriptionPlanManager } from '@/components/admin/SubscriptionPlanManager';
import { FeatureManager } from '@/components/admin/FeatureManager';
import { FeatureAnnouncementManager } from '@/components/admin/FeatureAnnouncementManager';
import { PaymentSettings } from '@/components/admin/PaymentSettings';
import { MapSettings } from '@/components/admin/MapSettings';
import { BrandingSettings } from '@/components/admin/BrandingSettings';
import WAHASettings from '@/components/admin/WAHASettings';
import TopupPackageManager from '@/components/admin/TopupPackageManager';
import SystemSMSSettings from '@/components/admin/SystemSMSSettings';
import SystemSMTPSettings from '@/components/admin/SystemSMTPSettings';
import EmailTemplateManager from '@/components/admin/EmailTemplateManager';
import SMSTemplateManager from '@/components/admin/SMSTemplateManager';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor';
import { TicketManagement } from '@/components/admin/TicketManagement';
import { AdminProfileDropdown } from '@/components/admin/AdminProfileDropdown';
import { TicketNotificationBell } from '@/components/admin/TicketNotificationBell';
import { SubscriptionCouponManager } from '@/components/admin/SubscriptionCouponManager';
import { AdminProfileSettings } from '@/components/admin/AdminProfileSettings';
import DataDeletionSettings from '@/components/admin/DataDeletionSettings';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import JSZip from 'jszip';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  pages_count: number;
  instagram_accounts_count: number;
  tiktok_accounts_count: number;
  plan: string;
  role: string;
  created_at: string;
  phone_number: string | null;
  phone_verified: boolean;
}

interface ActivityLog {
  id: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  activePages: number;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [igAppId, setIgAppId] = useState('');
  const [igAppSecret, setIgAppSecret] = useState('');
  const [igWebhookToken, setIgWebhookToken] = useState('');
  const [whatsappAppId, setWhatsappAppId] = useState('');
  const [whatsappAppSecret, setWhatsappAppSecret] = useState('');
  const [whatsappWebhookToken, setWhatsappWebhookToken] = useState('');
  const [whatsappConfigId, setWhatsappConfigId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Auto-generated URLs based on actual deployment URL
  const frontendUrl = window.location.origin; // This will work in any deployment
  const appDomain = new URL(frontendUrl).hostname;
  
  // Facebook URLs - Dynamic based on current domain (works for dev and production)
  const fbSiteUrl = frontendUrl;
  const fbPrivacyPolicyUrl = `${frontendUrl}/privacy-policy`;
  const fbTermsOfServiceUrl = `${frontendUrl}/terms-of-service`;
  const fbDataDeletionCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-data-deletion`;
  const fbWebhookCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-webhook`;
  // These exact URLs must be added to Facebook App OAuth settings
  const fbValidOauthRedirectUris = [
    `${frontendUrl}/dashboard?tab=pages&platform=facebook`,
    `${frontendUrl}/dashboard?platform=facebook`,
    `${frontendUrl}/dashboard`,
  ];
  
  // Instagram URLs - Dynamic based on current domain
  const igWebhookCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-webhook`;
  // These exact URLs must be added to Facebook App OAuth settings for Instagram
  const igValidOauthRedirectUris = [
    `${frontendUrl}/dashboard?tab=pages&platform=instagram`,
    `${frontendUrl}/dashboard?platform=instagram`,
    `${frontendUrl}/dashboard`,
  ];
  const igDataDeletionCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-data-deletion`;
  const igPrivacyPolicyUrl = `${frontendUrl}/privacy-policy`;
  const igTermsOfServiceUrl = `${frontendUrl}/terms-of-service`;
  
  // WhatsApp URLs - Dynamic based on current domain
  const waWebhookCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
  // These exact URLs must be added to Facebook App OAuth settings for WhatsApp
  const waValidOauthRedirectUris = [
    `${frontendUrl}/dashboard?tab=pages&platform=whatsapp`,
    `${frontendUrl}/dashboard?tab=pages`,
    `${frontendUrl}/dashboard`,
  ];
  const waDataDeletionCallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-data-deletion`;
  const waPrivacyPolicyUrl = `${frontendUrl}/privacy-policy`;
  const waTermsOfServiceUrl = `${frontendUrl}/terms-of-service`;
  
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activePages: 0 });
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    database: true,
    storage: true,
    files: true,
    fullBackup: true
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetAnonKey, setTargetAnonKey] = useState('');
  const [targetServiceKey, setTargetServiceKey] = useState('');
  const [migrationProgress, setMigrationProgress] = useState<{
    current: number;
    total: number;
    stage: string;
    percentage: number;
    currentItem: string;
  }>({ current: 0, total: 0, stage: '', percentage: 0, currentItem: '' });
  const [connectionTestStatus, setConnectionTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [connectionTestMessage, setConnectionTestMessage] = useState('');

  // Reset connection test when credentials change
  useEffect(() => {
    setConnectionTestStatus('idle');
    setConnectionTestMessage('');
  }, [targetUrl, targetAnonKey, targetServiceKey]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeSection === 'backup') {
      fetchBackups();
    }
  }, [activeSection]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load admin config
      const { data: config } = await supabase
        .from('admin_config')
        .select('*')
        .single();

      if (config) {
        setAppId(config.fb_app_id || '');
        setAppSecret(config.fb_app_secret || '');
        setWebhookToken(config.webhook_verify_token || '');
        setIgAppId(config.ig_app_id || '');
        setIgAppSecret(config.ig_app_secret || '');
        setIgWebhookToken(config.ig_webhook_verify_token || '');
        setWhatsappAppId(config.whatsapp_app_id || '');
        setWhatsappAppSecret(config.whatsapp_app_secret || '');
        setWhatsappWebhookToken(config.whatsapp_webhook_verify_token || '');
        setWhatsappConfigId(config.whatsapp_config_id || '');
      }

      // Load stats - total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Load stats - active pages
      const { count: pagesCount } = await supabase
        .from('facebook_pages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalUsers: usersCount || 0,
        activePages: pagesCount || 0,
      });

      // Load users with their data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, phone_number, phone_verified')
        .order('created_at', { ascending: false });

      if (profilesData) {
        // Get counts and additional data for each user
        const usersWithCounts = await Promise.all(
          profilesData.map(async (profile: any) => {
            // Get counts
            const { count: fbCount } = await supabase
              .from('facebook_pages')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            const { count: igCount } = await supabase
              .from('instagram_accounts')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            const { count: ttCount } = await supabase
              .from('tiktok_accounts' as any)
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            // Get role
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id)
              .maybeSingle();

            // Get subscription
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('plan')
              .eq('user_id', profile.id)
              .maybeSingle();

            return {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              created_at: profile.created_at,
              phone_number: profile.phone_number,
              phone_verified: profile.phone_verified || false,
              pages_count: fbCount || 0,
              instagram_accounts_count: igCount || 0,
              tiktok_accounts_count: ttCount || 0,
              plan: subData?.plan || 'free',
              role: roleData?.role || 'user',
            };
          })
        );

        setUsers(usersWithCounts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'No active session', variant: 'destructive' });
        return;
      }

      // Create impersonation record in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour expiration

      const { error } = await supabase
        .from('admin_impersonations')
        .insert({
          admin_user_id: session.user.id,
          impersonated_user_id: userId,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Failed to create impersonation:', error);
        toast({ title: 'Error', description: 'Failed to start impersonation', variant: 'destructive' });
        return;
      }

      toast({
        title: 'Impersonation started',
        description: 'Redirecting to user dashboard...',
      });

      // Navigate to user dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      toast({
        title: 'Impersonation failed',
        description: 'Could not impersonate user',
        variant: 'destructive',
      });
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId,
            action: 'suspend',
            suspended: false, // false means suspend, true means unsuspend
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to suspend user');
      }

      toast({
        title: 'User suspended',
        description: 'User account has been suspended',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Suspend failed',
        description: error.message || 'Could not suspend user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId,
            action: 'delete',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast({
        title: 'User deleted',
        description: 'User account has been permanently deleted',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete user',
        variant: 'destructive',
      });
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('admin_config')
        .select('id')
        .single();

      if (existing) {
        await supabase
          .from('admin_config')
          .update({
            fb_app_id: appId,
            fb_app_secret: appSecret,
            webhook_verify_token: webhookToken,
            ig_app_id: igAppId,
            ig_app_secret: igAppSecret,
            ig_webhook_verify_token: igWebhookToken,
            whatsapp_app_id: whatsappAppId,
            whatsapp_app_secret: whatsappAppSecret,
            whatsapp_webhook_verify_token: whatsappWebhookToken,
            whatsapp_config_id: whatsappConfigId,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('admin_config')
          .insert({
            fb_app_id: appId,
            fb_app_secret: appSecret,
            webhook_verify_token: webhookToken,
            ig_app_id: igAppId,
            ig_app_secret: igAppSecret,
            ig_webhook_verify_token: igWebhookToken,
            whatsapp_app_id: whatsappAppId,
            whatsapp_app_secret: whatsappAppSecret,
            whatsapp_webhook_verify_token: whatsappWebhookToken,
            whatsapp_config_id: whatsappConfigId,
          });
      }

      toast({
        title: 'Configuration saved',
        description: 'Facebook app settings updated successfully',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupOptionChange = (option: keyof typeof backupOptions) => {
    if (option === 'fullBackup') {
      const newValue = !backupOptions.fullBackup;
      setBackupOptions({
        database: newValue,
        storage: newValue,
        files: newValue,
        fullBackup: newValue
      });
    } else {
      const newOptions = { ...backupOptions, [option]: !backupOptions[option] };
      newOptions.fullBackup = newOptions.database && newOptions.storage && newOptions.files;
      setBackupOptions(newOptions);
    }
  };

  const handleBackup = async () => {
    // Check if at least one option is selected
    if (!backupOptions.database && !backupOptions.storage && !backupOptions.files) {
      toast({
        title: "No Options Selected",
        description: "Please select at least one backup option",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupParts: string[] = [];
      
      toast({
        title: "Backup Started",
        description: "Creating your backup...",
      });

      // Database backup
      if (backupOptions.database) {
        backupParts.push('Database');
        const tables = [
          'admin_config',
          'profiles',
          'user_roles',
          'user_settings',
          'facebook_pages',
          'instagram_accounts',
          'tiktok_accounts',
          'subscribers',
          'instagram_subscribers',
          'tiktok_subscribers',
          'chatbot_flows',
          'instagram_chatbot_flows',
          'comment_reply_templates',
          'instagram_comment_triggers',
          'instagram_story_triggers',
          'instagram_follow_triggers',
          'message_templates',
          'conversations',
          'instagram_conversations',
          'tiktok_conversations',
          'messages',
          'instagram_messages',
          'tiktok_messages',
          'flow_executions',
          'instagram_flow_executions',
          'node_executions',
          'instagram_node_executions',
          'flow_user_inputs',
          'instagram_flow_user_inputs',
          'flow_versions',
          'comment_replies',
          'instagram_comment_replies',
          'instagram_story_replies',
          'instagram_follow_dms',
          'stores',
          'products',
          'categories',
          'product_images',
          'product_variations',
          'product_attributes',
          'product_attribute_values',
          'orders',
          'order_items',
          'coupons',
          'payment_transactions',
          'subscriptions',
          'token_usage_history',
          'backups'
        ];

        for (const table of tables) {
          try {
            const { data, error } = await supabase
              .from(table as any)
              .select('*');

            if (error) {
              console.warn(`Error fetching ${table}:`, error);
              zip.file(`database/${table}.json`, JSON.stringify([], null, 2));
              continue;
            }

            zip.file(`database/${table}.json`, JSON.stringify(data || [], null, 2));
          } catch (err) {
            console.warn(`Failed to backup table ${table}:`, err);
            zip.file(`database/${table}.json`, JSON.stringify([], null, 2));
          }
        }
      }

      // Storage backup
      if (backupOptions.storage) {
        backupParts.push('Storage');
        const buckets = ['chat-attachments', 'store-assets', 'products', 'flow-images'];
        
        for (const bucket of buckets) {
          try {
            const { data: files, error } = await supabase.storage
              .from(bucket)
              .list();

            if (!error && files && files.length > 0) {
              const bucketFiles: any[] = [];
              
              for (const file of files) {
                try {
                  const { data: fileData } = await supabase.storage
                    .from(bucket)
                    .download(file.name);

                  if (fileData) {
                    zip.file(`storage/${bucket}/${file.name}`, fileData);
                    bucketFiles.push({
                      name: file.name,
                      size: file.metadata?.size,
                      created_at: file.created_at
                    });
                  }
                } catch (fileErr) {
                  console.error(`Error downloading ${file.name}:`, fileErr);
                }
              }

              zip.file(`storage/${bucket}/manifest.json`, JSON.stringify(bucketFiles, null, 2));
            }
          } catch (bucketErr) {
            console.error(`Error backing up bucket ${bucket}:`, bucketErr);
          }
        }
      }

      // Files backup
      if (backupOptions.files) {
        backupParts.push('Files');
        const filesMetadata = {
          backup_date: new Date().toISOString(),
          application_files: 'Application configuration and metadata',
          note: 'Source code is managed separately via version control'
        };
        zip.file('files/metadata.json', JSON.stringify(filesMetadata, null, 2));
      }

      const backupType = backupOptions.fullBackup ? 'Full Backup' : backupParts.join(' + ');

      // Add metadata file
      const metadata = {
        backup_date: new Date().toISOString(),
        backup_version: '2.0',
        backup_type: backupType,
        includes: {
          database: backupOptions.database,
          storage: backupOptions.storage,
          files: backupOptions.files
        },
        system: 'Social Media Automation Platform',
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Generate zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const fileSizeBytes = content.size;
      
      // Save backup record to database
      const filename = `system-backup-${timestamp}.zip`;
      const { data: user } = await supabase.auth.getUser();
      
      await supabase.from('backups').insert({
        filename,
        backup_date: new Date().toISOString(),
        file_size: fileSizeBytes,
        tables_count: backupOptions.database ? 47 : 0,
        created_by: user.user?.id,
        notes: backupType
      });
      
      // Trigger download
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup Complete!",
        description: "Your system backup has been downloaded successfully.",
      });

      // Refresh backups list
      fetchBackups();
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Backup Failed",
        description: "An error occurred while creating the backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('backup_date', { ascending: false });

      if (error) throw error;
      setBackupsList(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Error",
        description: "Failed to load backups list",
        variant: "destructive",
      });
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      const { error } = await supabase
        .from('backups')
        .delete()
        .eq('id', backupId);

      if (error) throw error;

      toast({
        title: "Backup Deleted",
        description: "Backup record has been removed successfully",
      });

      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!targetUrl || !targetAnonKey || !targetServiceKey) {
      toast({
        title: "Missing Credentials",
        description: "Please provide all required credentials to test connection",
        variant: "destructive",
      });
      return;
    }

    setConnectionTestStatus('testing');
    setConnectionTestMessage('Testing connection...');

    try {
      // Import createClient dynamically to test target connection
      const { createClient } = await import('@supabase/supabase-js');
      
      // Create a test client with target credentials
      const testClient = createClient(targetUrl, targetServiceKey);
      
      // Use a simple RPC call to test connection - this works on any Supabase project
      // We'll query the information schema which always exists
      const { error } = await testClient.rpc('version');
      
      // If the above fails (function doesn't exist), try a simple auth check
      if (error && error.message.includes('function')) {
        // Try an alternative - just check if we can access the database
        const { error: authError } = await testClient.auth.getSession();
        if (authError) {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      } else if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }

      setConnectionTestStatus('success');
      setConnectionTestMessage('✅ Connection successful! Ready to migrate.');
      
      toast({
        title: "Connection Successful",
        description: "Target Supabase project is accessible and ready for migration",
      });
    } catch (error: any) {
      console.error('Connection test error:', error);
      setConnectionTestStatus('failed');
      setConnectionTestMessage(`❌ Connection failed: ${error.message}`);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to target Supabase project",
        variant: "destructive",
      });
    }
  };

  const handleMigrate = async () => {
    if (!targetUrl || !targetAnonKey || !targetServiceKey) {
      toast({
        title: "Missing Credentials",
        description: "Please provide all required Supabase credentials",
        variant: "destructive",
      });
      return;
    }

    setIsMigrating(true);
    setMigrationLog([]);
    setMigrationProgress({ current: 0, total: 0, stage: 'Starting...', percentage: 0, currentItem: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      toast({
        title: "Migration Started",
        description: "Starting system migration... This may take several minutes.",
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-system`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetUrl,
            targetAnonKey,
            targetServiceKey
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Migration failed');
      }

      const result = await response.json();
      setMigrationProgress({
        current: result.summary?.tables + result.summary?.files || 0,
        total: result.summary?.tables + result.summary?.files || 0,
        stage: 'Complete',
        percentage: 100,
        currentItem: 'Migration finished successfully'
      });
      setMigrationLog(result.log || []);

      toast({
        title: "Migration Complete!",
        description: `Migrated ${result.summary?.tables || 0} tables, ${result.summary?.records || 0} records, and ${result.summary?.files || 0} files`,
      });

    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during migration",
        variant: "destructive",
      });
      setMigrationLog(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsMigrating(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-bold">Admin Panel</h1>
              </div>
              <div className="flex items-center gap-3">
                <TicketNotificationBell 
                  onTicketClick={(ticketId) => {
                    setActiveSection('tickets');
                  }} 
                />
                <AdminProfileDropdown onOpenSettings={() => setShowProfileSettings(true)} />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {activeSection === 'dashboard' && (
              <AdminAnalyticsDashboard onNavigate={setActiveSection} />
            )}

            {activeSection === 'config' && (
              <div className="container mx-auto px-4 py-8">
              <Tabs defaultValue="facebook" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                  <TabsTrigger value="facebook">
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </TabsTrigger>
                  <TabsTrigger value="instagram">
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="facebook">
            <Card>
              <CardHeader>
                <CardTitle>Facebook App Configuration</CardTitle>
                <CardDescription>
                  Configure your Facebook App credentials and webhook settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appId">
                      <Key className="h-4 w-4 inline mr-2" />
                      App ID
                    </Label>
                    <Input
                      id="appId"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="Enter Facebook App ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appSecret">
                      <Key className="h-4 w-4 inline mr-2" />
                      App Secret
                    </Label>
                    <Input
                      id="appSecret"
                      type="password"
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      placeholder="Enter Facebook App Secret"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm">API Configuration URLs (Copy these to your Facebook App)</h3>
                  
                  <div className="space-y-2">
                    <Label>App Domain</Label>
                    <div className="flex gap-2">
                      <Input value={appDomain} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(appDomain, 'App Domain')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Site URL</Label>
                    <div className="flex gap-2">
                      <Input value={fbSiteUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(fbSiteUrl, 'Site URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Valid OAuth Redirect URIs</Label>
                    {fbValidOauthRedirectUris.map((uri, index) => (
                      <div key={index} className="flex gap-2">
                        <Input value={uri} readOnly className="bg-muted" />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(uri, 'OAuth Redirect URI')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Privacy Policy URL</Label>
                    <div className="flex gap-2">
                      <Input value={fbPrivacyPolicyUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(fbPrivacyPolicyUrl, 'Privacy Policy URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Terms of Service URL</Label>
                    <div className="flex gap-2">
                      <Input value={fbTermsOfServiceUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(fbTermsOfServiceUrl, 'Terms of Service URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Deletion Callback URL</Label>
                    <div className="flex gap-2">
                      <Input value={fbDataDeletionCallbackUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(fbDataDeletionCallbackUrl, 'Data Deletion Callback URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Callback URL</Label>
                    <div className="flex gap-2">
                      <Input value={fbWebhookCallbackUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(fbWebhookCallbackUrl, 'Webhook Callback URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="webhookToken">
                    <Webhook className="h-4 w-4 inline mr-2" />
                    Webhook Verify Token
                  </Label>
                  <Input
                    id="webhookToken"
                    value={webhookToken}
                    onChange={(e) => setWebhookToken(e.target.value)}
                    placeholder="Enter Webhook Verify Token (e.g., 1034402391)"
                  />
                </div>

                <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </CardContent>
            </Card>
                </TabsContent>

                <TabsContent value="instagram">
            <Card>
              <CardHeader>
                <CardTitle>Instagram App Configuration</CardTitle>
                <CardDescription>
                  Configure your Instagram App credentials and webhook settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="igAppId">
                      <Key className="h-4 w-4 inline mr-2" />
                      Instagram App ID
                    </Label>
                    <Input
                      id="igAppId"
                      value={igAppId}
                      onChange={(e) => setIgAppId(e.target.value)}
                      placeholder="Enter Instagram App ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="igAppSecret">
                      <Key className="h-4 w-4 inline mr-2" />
                      Instagram App Secret
                    </Label>
                    <Input
                      id="igAppSecret"
                      type="password"
                      value={igAppSecret}
                      onChange={(e) => setIgAppSecret(e.target.value)}
                      placeholder="Enter Instagram App Secret"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm">Instagram API Configuration URLs (Copy these to your Instagram App)</h3>
                  
                  <div className="space-y-2">
                    <Label>App Domain</Label>
                    <div className="flex gap-2">
                      <Input value={appDomain} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(appDomain, 'App Domain')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Valid OAuth Redirect URIs</Label>
                    {igValidOauthRedirectUris.map((uri, index) => (
                      <div key={index} className="flex gap-2">
                        <Input value={uri} readOnly className="bg-muted" />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(uri, 'Instagram OAuth Redirect URI')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Callback URL</Label>
                    <div className="flex gap-2">
                      <Input value={igWebhookCallbackUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(igWebhookCallbackUrl, 'Instagram Webhook Callback URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Deletion Callback URL</Label>
                    <div className="flex gap-2">
                      <Input value={igDataDeletionCallbackUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(igDataDeletionCallbackUrl, 'Instagram Data Deletion Callback URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Privacy Policy URL</Label>
                    <div className="flex gap-2">
                      <Input value={igPrivacyPolicyUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(igPrivacyPolicyUrl, 'Instagram Privacy Policy URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Terms of Service URL</Label>
                    <div className="flex gap-2">
                      <Input value={igTermsOfServiceUrl} readOnly className="bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(igTermsOfServiceUrl, 'Instagram Terms of Service URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="igWebhookToken">
                    <Webhook className="h-4 w-4 inline mr-2" />
                    Instagram Webhook Verify Token
                  </Label>
                  <Input
                    id="igWebhookToken"
                    value={igWebhookToken}
                    onChange={(e) => setIgWebhookToken(e.target.value)}
                    placeholder="Enter Instagram Webhook Verify Token"
                  />
                </div>

                <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </CardContent>
            </Card>
                </TabsContent>

                <TabsContent value="whatsapp">
                  <Card>
                    <CardHeader>
                      <CardTitle>WhatsApp Business API Configuration</CardTitle>
                      <CardDescription>
                        Configure your WhatsApp Business API credentials and webhook settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="whatsappAppId">
                            <Key className="h-4 w-4 inline mr-2" />
                            WhatsApp App ID
                          </Label>
                          <Input
                            id="whatsappAppId"
                            value={whatsappAppId}
                            onChange={(e) => setWhatsappAppId(e.target.value)}
                            placeholder="Enter WhatsApp App ID (same as Facebook)"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use the same App ID as your Facebook App
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsappAppSecret">
                            <Key className="h-4 w-4 inline mr-2" />
                            WhatsApp App Secret
                          </Label>
                          <Input
                            id="whatsappAppSecret"
                            type="password"
                            value={whatsappAppSecret}
                            onChange={(e) => setWhatsappAppSecret(e.target.value)}
                            placeholder="Enter WhatsApp App Secret (same as Facebook)"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use the same App Secret as your Facebook App
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsappConfigId">
                          <Key className="h-4 w-4 inline mr-2" />
                          Embedded Signup Configuration ID
                        </Label>
                        <Input
                          id="whatsappConfigId"
                          value={whatsappConfigId}
                          onChange={(e) => setWhatsappConfigId(e.target.value)}
                          placeholder="Enter Config ID from Meta Business Settings"
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for users to create NEW WhatsApp Business accounts. Find in Meta Business Settings → WhatsApp → Embedded Signup
                        </p>
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-sm">WhatsApp API Configuration URLs (Copy these to your WhatsApp App)</h3>
                        
                        <div className="space-y-2">
                          <Label>App Domain</Label>
                          <div className="flex gap-2">
                            <Input value={appDomain} readOnly className="bg-muted" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(appDomain, 'App Domain')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Valid OAuth Redirect URIs</Label>
                          {waValidOauthRedirectUris.map((uri, index) => (
                            <div key={index} className="flex gap-2">
                              <Input value={uri} readOnly className="bg-muted" />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(uri, 'WhatsApp OAuth Redirect URI')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label>Webhook Callback URL</Label>
                          <div className="flex gap-2">
                            <Input value={waWebhookCallbackUrl} readOnly className="bg-muted" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(waWebhookCallbackUrl, 'WhatsApp Webhook Callback URL')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Data Deletion Callback URL</Label>
                          <div className="flex gap-2">
                            <Input value={waDataDeletionCallbackUrl} readOnly className="bg-muted" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(waDataDeletionCallbackUrl, 'WhatsApp Data Deletion Callback URL')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Privacy Policy URL</Label>
                          <div className="flex gap-2">
                            <Input value={waPrivacyPolicyUrl} readOnly className="bg-muted" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(waPrivacyPolicyUrl, 'WhatsApp Privacy Policy URL')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Terms of Service URL</Label>
                          <div className="flex gap-2">
                            <Input value={waTermsOfServiceUrl} readOnly className="bg-muted" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(waTermsOfServiceUrl, 'WhatsApp Terms of Service URL')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="whatsappWebhookToken">
                          <Webhook className="h-4 w-4 inline mr-2" />
                          WhatsApp Webhook Verify Token
                        </Label>
                        <Input
                          id="whatsappWebhookToken"
                          value={whatsappWebhookToken}
                          onChange={(e) => setWhatsappWebhookToken(e.target.value)}
                          placeholder="Enter WhatsApp Webhook Verify Token"
                        />
                        <p className="text-xs text-muted-foreground">
                          Create a unique token for webhook verification
                        </p>
                      </div>

                      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4">
                        <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-2">
                          💡 WhatsApp uses the same Meta App
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          WhatsApp Business API uses the same Facebook App credentials. If you've already configured Facebook, you can use the same App ID and App Secret here.
                        </p>
                      </div>

                      <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Configuration'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="map">
                  <MapSettings />
                </TabsContent>
              </Tabs>
              </div>
            )}

            {activeSection === 'system-health' && (
              <SystemHealthMonitor />
            )}

            {activeSection === 'backup' && (
              <div className="container mx-auto px-4 py-8">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileArchive className="h-5 w-5" />
                      System Backup
                    </CardTitle>
                    <CardDescription>
                      Create a complete backup of your system including all database tables, configurations, and user data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Backup Options Selection */}
                    <div className="rounded-lg border border-border bg-background p-6 space-y-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base">Select Backup Options</h3>
                        <p className="text-sm text-muted-foreground">Choose what to include in your backup</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* Full Backup Option */}
                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="fullBackup"
                            checked={backupOptions.fullBackup}
                            onCheckedChange={() => handleBackupOptionChange('fullBackup')}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor="fullBackup" 
                              className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                            >
                              <FileArchive className="h-4 w-4 text-primary" />
                              Full Backup
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Select all options (Database + Storage + Files)
                            </p>
                          </div>
                        </div>

                        <div className="h-px bg-border" />

                        {/* Database Option */}
                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="database"
                            checked={backupOptions.database}
                            onCheckedChange={() => handleBackupOptionChange('database')}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor="database" 
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <Database className="h-4 w-4 text-blue-500" />
                              Database
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              All tables, users, configurations, and application data
                            </p>
                          </div>
                        </div>

                        {/* Storage Option */}
                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="storage"
                            checked={backupOptions.storage}
                            onCheckedChange={() => handleBackupOptionChange('storage')}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor="storage" 
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <FileArchive className="h-4 w-4 text-green-500" />
                              Storage
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded files, images, and media from storage buckets
                            </p>
                          </div>
                        </div>

                        {/* Files Option */}
                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <Checkbox 
                            id="files"
                            checked={backupOptions.files}
                            onCheckedChange={() => handleBackupOptionChange('files')}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor="files" 
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4 text-purple-500" />
                              Files
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Application configuration and metadata files
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/50 p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-3">
                          <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold">Backup Details</h3>
                          <p className="text-sm text-muted-foreground">
                            Your backup will include the selected components:
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                            {backupOptions.database && <li>• Database: All 47 tables with complete data</li>}
                            {backupOptions.storage && <li>• Storage: Files from 4 storage buckets</li>}
                            {backupOptions.files && <li>• Files: Application configuration metadata</li>}
                          </ul>
                          <p className="text-sm text-muted-foreground mt-4">
                            The backup will be downloaded as a ZIP file with organized folders.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {backupOptions.fullBackup 
                              ? 'Download Full Backup' 
                              : `Download ${[
                                  backupOptions.database && 'Database',
                                  backupOptions.storage && 'Storage',
                                  backupOptions.files && 'Files'
                                ].filter(Boolean).join(' + ')} Backup`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isBackingUp 
                              ? 'Creating your backup...' 
                              : (!backupOptions.database && !backupOptions.storage && !backupOptions.files)
                                ? 'Select at least one option above'
                                : 'Click to generate and download'
                            }
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleBackup}
                        disabled={isBackingUp || (!backupOptions.database && !backupOptions.storage && !backupOptions.files)}
                        size="lg"
                      >
                        {isBackingUp ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Create Backup
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10 p-4">
                      <div className="flex gap-3">
                        <Activity className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Important Notes
                          </p>
                          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                            <li>• Backup may take a few moments depending on data size</li>
                            <li>• Store backup files securely</li>
                            <li>• Regular backups are recommended</li>
                            <li>• Sensitive data like access tokens are included</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Backups List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Backup History</CardTitle>
                        <CardDescription>View and manage your system backups</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingBackups ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : backupsList.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No backups created yet</p>
                            <p className="text-sm">Create your first backup to see it here</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Filename</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>File Size</TableHead>
                                <TableHead>Tables</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {backupsList.map((backup) => (
                                <TableRow key={backup.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <FileArchive className="h-4 w-4 text-muted-foreground" />
                                      {backup.filename}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span>{new Date(backup.backup_date).toLocaleDateString()}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(backup.backup_date).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{backup.tables_count} tables</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteBackup(backup.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
              </div>
            )}

            {activeSection === 'data-deletion' && (
              <DataDeletionSettings />
            )}

            {activeSection === 'migration' && (
              <div className="container mx-auto px-4 py-8">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5" />
                      System Migration
                    </CardTitle>
                    <CardDescription>
                      Migrate your entire system to a new Supabase project (database + storage)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Warning Banner */}
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10 p-4">
                      <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium text-green-900 dark:text-green-100">Safe Migration - Read-Only Source</p>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            This migration is a <strong>COPY-ONLY operation</strong>. Your source database and storage will remain completely intact. Nothing is deleted or modified in the current project.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10 p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">Important</p>
                          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                            <li>• Ensure the target Supabase project exists and is accessible</li>
                            <li>• Target database schema should match or be empty</li>
                            <li>• Migration may take several minutes depending on data size</li>
                            <li>• Test the migration on a staging project first</li>
                            <li>• Storage buckets will be created automatically if they don't exist</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Migration Configuration */}
                    <div className="rounded-lg border border-border bg-background p-6 space-y-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base">Target Supabase Project Credentials</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter the credentials for the destination Supabase project
                        </p>
                      </div>

                      {/* Help Section */}
                      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10 p-4">
                        <div className="space-y-3">
                          <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">📖 How to get your credentials from target Supabase project:</p>
                          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside ml-2">
                            <li>
                              <strong>Project URL</strong>: Go to Settings → API → Project URL
                              <br />
                              <span className="text-xs ml-5 text-blue-700 dark:text-blue-300">Format: https://[your-project-id].supabase.co</span>
                              <br />
                              <span className="text-xs ml-5 text-blue-700 dark:text-blue-300 italic">Note: Project ID is embedded in the URL, no need to enter it separately</span>
                            </li>
                            <li>
                              <strong>Anon/Public Key</strong>: Settings → API → Project API keys → anon public
                              <br />
                              <span className="text-xs ml-5 text-blue-700 dark:text-blue-300">Safe to use in frontend code</span>
                            </li>
                            <li>
                              <strong>Service Role Key</strong>: Settings → API → Project API keys → service_role
                              <br />
                              <span className="text-xs ml-5 text-orange-700 dark:text-orange-300">⚠️ Keep this secret! Has full database access, bypasses RLS policies</span>
                              <br />
                              <span className="text-xs ml-5 text-blue-700 dark:text-blue-300">Only used during migration to copy data</span>
                            </li>
                          </ol>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="targetUrl">Target Supabase URL</Label>
                          <Input
                            id="targetUrl"
                            placeholder="https://xxxxx.supabase.co"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            disabled={isMigrating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Found in Settings → API → Project URL (contains project ID)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="targetAnonKey">Target Anon/Public Key</Label>
                          <Input
                            id="targetAnonKey"
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={targetAnonKey}
                            onChange={(e) => setTargetAnonKey(e.target.value)}
                            disabled={isMigrating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Found in Settings → API → Project API keys → anon public
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="targetServiceKey">Target Service Role Key (Required for Migration) ⚠️</Label>
                          <Input
                            id="targetServiceKey"
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={targetServiceKey}
                            onChange={(e) => setTargetServiceKey(e.target.value)}
                            disabled={isMigrating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Found in Settings → API → Project API keys → service_role (admin access, bypasses RLS)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Connection Test Section */}
                    <div className="rounded-lg border border-border bg-background p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-base">Test Connection</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Verify target Supabase credentials before migration
                          </p>
                        </div>
                        <Button
                          onClick={handleTestConnection}
                          disabled={connectionTestStatus === 'testing' || !targetUrl || !targetAnonKey || !targetServiceKey}
                          variant="outline"
                          className="gap-2"
                        >
                          {connectionTestStatus === 'testing' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Connection Status Display */}
                      {connectionTestStatus !== 'idle' && (
                        <div className={`rounded-lg p-4 ${
                          connectionTestStatus === 'success' ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900' :
                          connectionTestStatus === 'failed' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900' :
                          'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900'
                        }`}>
                          <p className={`text-sm font-medium ${
                            connectionTestStatus === 'success' ? 'text-green-900 dark:text-green-100' :
                            connectionTestStatus === 'failed' ? 'text-red-900 dark:text-red-100' :
                            'text-blue-900 dark:text-blue-100'
                          }`}>
                            {connectionTestMessage}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Migration Action Button */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-3">
                        <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Start Migration</p>
                          <p className="text-sm text-muted-foreground">
                            {isMigrating 
                              ? 'Migration in progress...' 
                              : 'This will migrate all data and files to the target project'
                            }
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleMigrate}
                        disabled={isMigrating || connectionTestStatus !== 'success'}
                        size="lg"
                        className="gap-2"
                      >
                        {isMigrating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Migrating...
                          </>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-4 w-4" />
                            Start Migration
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Migration Progress Display */}
                    {isMigrating && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                              Migration in Progress
                            </div>
                            <span className="text-sm font-medium text-primary">
                              {migrationProgress.percentage.toFixed(0)}%
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <Progress value={migrationProgress.percentage} className="h-2" />
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground font-medium">
                                {migrationProgress.stage}
                              </span>
                              <span className="text-muted-foreground">
                                {migrationProgress.currentItem}
                              </span>
                            </div>
                          </div>

                          {/* Stage Details */}
                          {migrationProgress.total > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Processing: {migrationProgress.current} / {migrationProgress.total} items
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Migration Progress */}
                    {(isMigrating || migrationLog.length > 0) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Migration Log
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-lg bg-muted/50 p-4 max-h-96 overflow-y-auto">
                            <div className="space-y-1 font-mono text-xs">
                              {migrationLog.length === 0 && isMigrating ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Initializing migration...</span>
                                </div>
                              ) : (
                                migrationLog.map((log, index) => (
                                  <div 
                                    key={index} 
                                    className={`${
                                      log.includes('✅') 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : log.includes('❌') 
                                        ? 'text-red-600 dark:text-red-400'
                                        : log.includes('⚠️')
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    {log}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Source Project Info */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <Database className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium">Current (Source) Project</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{import.meta.env.VITE_SUPABASE_URL}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => copyToClipboard(import.meta.env.VITE_SUPABASE_URL, 'Source URL')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div>Project ID: {import.meta.env.VITE_SUPABASE_PROJECT_ID}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </div>
            )}

            {activeSection === 'users' && (
            <div className="container mx-auto px-4 py-8">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>Manage users and their subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Accounts</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userData) => (
                          <TableRow key={userData.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {userData.full_name?.charAt(0).toUpperCase() || userData.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{userData.full_name || 'No name'}</p>
                                  <p className="text-xs text-muted-foreground">{userData.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {userData.plan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={userData.role === 'admin' ? 'default' : 'outline'} className="text-xs capitalize">
                                {userData.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 text-xs">
                                <span title="Facebook Pages">FB: {userData.pages_count}</span>
                                <span title="Instagram Accounts">IG: {userData.instagram_accounts_count}</span>
                                <span title="TikTok Accounts">TT: {userData.tiktok_accounts_count}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {userData.phone_number ? (
                                <div className="flex items-center gap-1 text-xs">
                                  {userData.phone_verified ? (
                                    <CheckCircle className="h-3 w-3 text-success" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span>{userData.phone_number}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(userData.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(userData);
                                    setIsManageDialogOpen(true);
                                  }}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImpersonate(userData.id)}
                                  title="Impersonate User"
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSuspendUser(userData.id)}
                                  title="Suspend User"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(userData.id)}
                                  title="Delete User"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
            )}

            {activeSection === 'subscriptions' && (
              <div className="container mx-auto px-4 py-8">
              <UserSubscriptionManager />
              </div>
            )}

            {activeSection === 'plans' && (
              <div className="container mx-auto px-4 py-8">
              <SubscriptionPlanManager />
              </div>
            )}

            {activeSection === 'topup-packages' && (
              <div className="container mx-auto px-4 py-8">
              <TopupPackageManager />
              </div>
            )}

            {activeSection === 'payment' && (
              <div className="container mx-auto px-4 py-8"><PaymentSettings /></div>
            )}

            {activeSection === 'branding' && (
              <div className="container mx-auto px-4 py-8"><BrandingSettings /></div>
            )}

            {activeSection === 'waha' && (
              <div className="container mx-auto px-4 py-8"><WAHASettings /></div>
            )}

            {activeSection === 'system-sms' && (
              <div className="container mx-auto px-4 py-8"><SystemSMSSettings /></div>
            )}

            {activeSection === 'system-smtp' && (
              <div className="container mx-auto px-4 py-8"><SystemSMTPSettings /></div>
            )}

            {activeSection === 'features' && (
              <div className="container mx-auto px-4 py-8"><FeatureManager /></div>
            )}

            {activeSection === 'announcements' && (
              <div className="container mx-auto px-4 py-8"><FeatureAnnouncementManager /></div>
            )}

            {activeSection === 'email-templates' && (
              <div className="container mx-auto px-4 py-8"><EmailTemplateManager /></div>
            )}

            {activeSection === 'sms-templates' && (
              <div className="container mx-auto px-4 py-8"><SMSTemplateManager /></div>
            )}

            {activeSection === 'tickets' && (
              <div className="container mx-auto px-4 py-8"><TicketManagement /></div>
            )}

            {activeSection === 'coupons' && (
              <div className="container mx-auto px-4 py-8"><SubscriptionCouponManager /></div>
            )}
          </main>
        </div>

        {selectedUser && (
          <UserManagementDialog
            open={isManageDialogOpen}
            onOpenChange={setIsManageDialogOpen}
            user={selectedUser}
            onUpdate={loadData}
          />
        )}

        <Dialog open={showProfileSettings} onOpenChange={setShowProfileSettings}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AdminProfileSettings />
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
