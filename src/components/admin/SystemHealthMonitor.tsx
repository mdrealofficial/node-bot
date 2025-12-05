import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Search, Filter, Trash2, Eye, Download, Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  error_code: string | null;
  error_message: string;
  error_stack: string | null;
  component: string | null;
  severity: string;
  metadata: Record<string, any>;
  user_agent: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  today: number;
  critical: number;
  unresolved: number;
}

export function SystemHealthMonitor() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, critical: 0, unresolved: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('system-error-logs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_error_logs'
      }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch logs
      const { data, error } = await supabase
        .from('system_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const logsData = (data || []) as ErrorLog[];
      setLogs(logsData);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      setStats({
        total: logsData.length,
        today: logsData.filter(l => new Date(l.created_at) >= today).length,
        critical: logsData.filter(l => l.severity === 'critical').length,
        unresolved: logsData.filter(l => !l.resolved).length,
      });
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load error logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleMarkResolved = async (logId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_error_logs')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Error marked as resolved' });
      loadLogs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update log', variant: 'destructive' });
    }
  };

  const handleDelete = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('system_error_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Error log removed' });
      loadLogs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete log', variant: 'destructive' });
    }
  };

  const handleClearResolved = async () => {
    if (!confirm('Are you sure you want to delete all resolved logs?')) return;
    
    try {
      const { error } = await supabase
        .from('system_error_logs')
        .delete()
        .eq('resolved', true);

      if (error) throw error;

      toast({ title: 'Cleared', description: 'All resolved logs have been deleted' });
      loadLogs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear logs', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Timestamp', 'Severity', 'Type', 'Component', 'Message', 'Resolved'].join(','),
      ...filteredLogs.map(log => [
        log.id,
        log.created_at,
        log.severity,
        log.error_type,
        log.component || '',
        `"${log.error_message.replace(/"/g, '""')}"`,
        log.resolved ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.component?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.error_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesType = typeFilter === 'all' || log.error_type === typeFilter;
    const matchesResolved = resolvedFilter === 'all' || 
      (resolvedFilter === 'resolved' && log.resolved) ||
      (resolvedFilter === 'unresolved' && !log.resolved);

    return matchesSearch && matchesSeverity && matchesType && matchesResolved;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor system errors and logs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearResolved}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Resolved
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              Critical
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              Unresolved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.unresolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Error Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search errors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client_error">Client Error</SelectItem>
                <SelectItem value="edge_function_error">Edge Function</SelectItem>
                <SelectItem value="webhook_error">Webhook</SelectItem>
                <SelectItem value="database_error">Database</SelectItem>
                <SelectItem value="api_error">API Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[150px]">Component</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No errors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="text-xs">{log.error_type}</TableCell>
                      <TableCell className="text-xs font-mono">{log.component || '-'}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {log.error_message}
                      </TableCell>
                      <TableCell>
                        {log.resolved ? (
                          <Badge variant="secondary" className="text-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-500">
                            Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!log.resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkResolved(log.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredLogs.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 50 of {filteredLogs.length} logs
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Error Details
              {selectedLog && getSeverityBadge(selectedLog.severity)}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatTime(selectedLog.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Error Type</label>
                  <p className="text-sm text-muted-foreground">{selectedLog.error_type}</p>
                </div>
                
                {selectedLog.error_code && (
                  <div>
                    <label className="text-sm font-medium">Error Code</label>
                    <p className="text-sm font-mono">{selectedLog.error_code}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedLog.error_message}</p>
                </div>
                
                {selectedLog.component && (
                  <div>
                    <label className="text-sm font-medium">Component</label>
                    <p className="text-sm font-mono">{selectedLog.component}</p>
                  </div>
                )}
                
                {selectedLog.error_stack && (
                  <div>
                    <label className="text-sm font-medium">Stack Trace</label>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.error_stack}
                    </pre>
                  </div>
                )}
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Metadata</label>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.user_agent && (
                  <div>
                    <label className="text-sm font-medium">User Agent</label>
                    <p className="text-xs text-muted-foreground">{selectedLog.user_agent}</p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  {!selectedLog.resolved && (
                    <Button onClick={() => {
                      handleMarkResolved(selectedLog.id);
                      setSelectedLog(null);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => {
                    handleDelete(selectedLog.id);
                    setSelectedLog(null);
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}