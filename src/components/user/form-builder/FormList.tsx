import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Eye, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FormListProps {
  onEdit: (formId: string) => void;
  onCreate: () => void;
  onViewSubmissions: (formId: string) => void;
}

export const FormList = ({ onEdit, onCreate, onViewSubmissions }: FormListProps) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      toast.error("Failed to load forms");
      console.error("Error loading forms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formToDelete) return;

    try {
      const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", formToDelete);

      if (error) throw error;

      toast.success("Form deleted successfully");
      setForms(forms.filter(f => f.id !== formToDelete));
    } catch (error: any) {
      toast.error("Failed to delete form");
      console.error("Error deleting form:", error);
    } finally {
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  const handleDuplicate = async (form: Form) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: newForm, error: formError } = await supabase
        .from("forms")
        .insert([{
          user_id: userData.user?.id || '',
          name: `${form.name} (Copy)`,
          description: form.description,
          slug: `${form.slug}-copy-${Date.now()}`,
          status: 'draft'
        }])
        .select()
        .single();

      if (formError) throw formError;

      // Copy fields
      const { data: fields, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", form.id);

      if (fieldsError) throw fieldsError;

      if (fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          ...field,
          id: undefined,
          form_id: newForm.id
        }));

        const { error: insertError } = await supabase
          .from("form_fields")
          .insert(newFields);

        if (insertError) throw insertError;
      }

      toast.success("Form duplicated successfully");
      loadForms();
    } catch (error: any) {
      toast.error("Failed to duplicate form");
      console.error("Error duplicating form:", error);
    }
  };

  const copyFormLink = (slug: string) => {
    const link = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Form link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground mt-1">Create and manage your forms</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No forms yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first form to start collecting data
          </p>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <Card key={form.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{form.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        form.status === 'published' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {form.status}
                      </span>
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {form.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(form.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(form.id)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewSubmissions(form.id)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Submissions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyFormLink(form.slug)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(form)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormToDelete(form.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be undone.
              All submissions will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
