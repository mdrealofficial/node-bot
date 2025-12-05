import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Trash2, Plus, RefreshCw, Database, HardDrive, Clock, FileArchive } from 'lucide-react';
import { format } from 'date-fns';

interface Backup {
  id: string;
  filename: string;
  backup_date: string;
  file_size: number | null;
  tables_count: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

const BackupManager = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [backupNotes, setBackupNotes] = useState('');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('backup_date', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      toast.error('Failed to load backups', { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get list of tables to backup
      const tablesToBackup = [
        'profiles', 'subscriptions', 'facebook_pages', 'instagram_accounts',
        'chatbot_flows', 'instagram_chatbot_flows', 'whatsapp_chatbot_flows',
        'subscribers', 'instagram_subscribers', 'whatsapp_subscribers',
        'conversations', 'instagram_conversations', 'whatsapp_conversations',
        'messages', 'instagram_messages', 'whatsapp_messages',
        'stores', 'products', 'orders', 'store_customers',
        'forms', 'form_fields', 'form_submissions',
        'comment_reply_templates', 'instagram_comment_triggers'
      ];

      const backupData: Record<string, any[]> = {};
      let totalRows = 0;

      for (const table of tablesToBackup) {
        try {
          const { data, error } = await (supabase.from(table as any).select('*') as any);
          if (!error && data) {
            backupData[table] = data;
            totalRows += data.length;
          }
        } catch {
          // Table might not exist or no access
        }
      }

      // Create backup file
      const backupJson = JSON.stringify(backupData, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const filename = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;

      // Store backup metadata
      const { error: insertError } = await supabase.from('backups').insert({
        filename,
        backup_date: new Date().toISOString(),
        file_size: blob.size,
        tables_count: Object.keys(backupData).length,
        notes: backupNotes || null,
        created_by: user?.id
      });

      if (insertError) throw insertError;

      // Download backup file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup created: ${Object.keys(backupData).length} tables, ${totalRows} rows`, { duration: 3000 });
      setShowCreateDialog(false);
      setBackupNotes('');
      loadBackups();
    } catch (error: any) {
      toast.error('Backup failed: ' + error.message, { duration: 3000 });
    } finally {
      setCreating(false);
    }
  };

  const deleteBackup = async (id: string) => {
    try {
      const { error } = await supabase.from('backups').delete().eq('id', id);
      if (error) throw error;
      toast.success('Backup record deleted', { duration: 3000 });
      loadBackups();
    } catch (error: any) {
      toast.error('Failed to delete backup', { duration: 3000 });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading backups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backup & Recovery</h2>
          <p className="text-muted-foreground">Manage database backups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBackups}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(backups.reduce((sum, b) => sum + (b.file_size || 0), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backups.length > 0 
                ? format(new Date(backups[0].backup_date), 'MMM d, HH:mm')
                : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>Download or manage previous backups</CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups yet</p>
              <p className="text-sm">Create your first backup to secure your data</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Tables</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                    <TableCell>{format(new Date(backup.backup_date), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatFileSize(backup.file_size)}</Badge>
                    </TableCell>
                    <TableCell>{backup.tables_count || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{backup.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBackup(backup.id)}
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

      <Card>
        <CardHeader>
          <CardTitle>Recovery Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong>To restore from a backup:</strong>
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Download the backup JSON file from your local storage</li>
            <li>Contact support with the backup file for assisted restoration</li>
            <li>For critical data loss, emergency restoration can be performed within 24 hours</li>
          </ol>
          <p className="text-amber-600 dark:text-amber-400">
            ⚠️ Restoring a backup will overwrite current data. This action cannot be undone.
          </p>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
            <DialogDescription>
              This will export all your data as a JSON file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add notes about this backup..."
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createBackup} disabled={creating}>
              {creating ? 'Creating...' : 'Create Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupManager;
