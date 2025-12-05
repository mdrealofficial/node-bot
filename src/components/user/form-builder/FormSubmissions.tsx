import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Eye, Trash2, Mail, FileSpreadsheet, Filter } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Submission {
  id: string;
  form_id: string;
  data: any;
  visitor_info: any;
  submitted_at: string;
  read: boolean;
}

interface FormSubmissionsProps {
  formId: string;
}

export const FormSubmissions = ({ formId }: FormSubmissionsProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      toast.error("Failed to load submissions");
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from("form_submissions")
        .update({ read: true })
        .eq("id", submissionId);

      if (error) throw error;

      setSubmissions(submissions.map(s =>
        s.id === submissionId ? { ...s, read: true } : s
      ));
    } catch (error: any) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from("form_submissions")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;

      toast.success("Submission deleted");
      setSubmissions(submissions.filter(s => s.id !== submissionId));
    } catch (error: any) {
      toast.error("Failed to delete submission");
      console.error("Error deleting submission:", error);
    }
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }

    // Get all unique field names
    const allFields = new Set<string>();
    filteredSubmissions.forEach(sub => {
      Object.keys(sub.data).forEach(key => allFields.add(key));
    });

    // Create CSV header
    const headers = ["Submission ID", "Submitted At", "Status", ...Array.from(allFields)];
    const csvRows = [headers.join(",")];

    // Add data rows
    filteredSubmissions.forEach(sub => {
      const row = [
        sub.id,
        new Date(sub.submitted_at).toLocaleString(),
        sub.read ? "Read" : "Unread",
        ...Array.from(allFields).map(field => {
          const value = sub.data[field] || "";
          // Escape commas and quotes in CSV
          return `"${String(value).replace(/"/g, '""')}"`;
        })
      ];
      csvRows.push(row.join(","));
    });

    // Download CSV
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-submissions-${formId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Submissions exported to CSV");
  };

  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }

    // Prepare data for Excel
    const exportData = filteredSubmissions.map(sub => ({
      "Submission ID": sub.id,
      "Submitted At": new Date(sub.submitted_at).toLocaleString(),
      "Status": sub.read ? "Read" : "Unread",
      ...sub.data
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");

    // Generate Excel file
    XLSX.writeFile(wb, `form-submissions-${formId}-${Date.now()}.xlsx`);
    toast.success("Submissions exported to Excel");
  };

  const viewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    if (!submission.read) {
      markAsRead(submission.id);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Status filter
    if (statusFilter === "read" && !sub.read) return false;
    if (statusFilter === "unread" && sub.read) return false;

    // Date filter
    const submittedDate = new Date(sub.submitted_at);
    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (submittedDate < today) return false;
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (submittedDate < weekAgo) return false;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (submittedDate < monthAgo) return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const dataString = JSON.stringify(sub.data).toLowerCase();
      return dataString.includes(searchLower);
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Submissions</h2>
            <p className="text-muted-foreground">
              {filteredSubmissions.length} of {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={submissions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {filteredSubmissions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <Mail className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {submissions.length === 0 ? "No submissions yet" : "No matching submissions"}
          </h3>
          <p className="text-muted-foreground">
            {submissions.length === 0 
              ? "Submissions will appear here once users fill out your form"
              : "Try adjusting your filters to see more results"}
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Data Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    {!submission.read && (
                      <Badge variant="secondary">New</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(submission.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground truncate max-w-md">
                      {Object.entries(submission.data).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewSubmission(submission)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSubmission(submission.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Submitted on {new Date(selectedSubmission.submitted_at).toLocaleString()}
              </div>
              <div className="space-y-3">
                {Object.entries(selectedSubmission.data).map(([key, value]) => (
                  <Card key={key} className="p-4">
                    <div className="font-medium mb-1">{key}</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {String(value)}
                    </div>
                  </Card>
                ))}
              </div>
              {selectedSubmission.visitor_info && Object.keys(selectedSubmission.visitor_info).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Visitor Information</h4>
                  <Card className="p-4 text-sm">
                    {Object.entries(selectedSubmission.visitor_info).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
