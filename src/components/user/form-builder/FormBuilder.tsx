import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { FormBuilderSidebar } from "./FormBuilderSidebar";
import { FormBuilderCanvas } from "./FormBuilderCanvas";
import { FormFieldEditor } from "./FormFieldEditor";
import { FormSettings } from "./FormSettings";

export interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder?: string;
  help_text?: string;
  required: boolean;
  position: number;
  options?: any[];
  validation?: any;
  conditional_logic?: any;
}

interface FormBuilderProps {
  formId?: string;
  onBack: () => void;
}

export const FormBuilder = ({ formId, onBack }: FormBuilderProps) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [formName, setFormName] = useState("Untitled Form");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [settings, setSettings] = useState<any>({});
  const [styling, setStyling] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentFormId, setCurrentFormId] = useState(formId);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (formId) {
      loadForm();
    } else {
      // Generate default slug for new form
      setSlug(generateSlug(formName));
    }
  }, [formId]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  };

  const loadForm = async () => {
    try {
      const { data: form, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (formError) throw formError;

      setFormName(form.name);
      setSlug(form.slug);
      setDescription(form.description || "");
      setStatus(form.status);
      setSettings(form.settings || {});
      setStyling(form.styling || {});

      const { data: fieldsData, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("position");

      if (fieldsError) throw fieldsError;

      setFields((fieldsData || []).map(field => ({
        ...field,
        options: field.options as any[],
        validation: field.validation as any,
        conditional_logic: field.conditional_logic as any,
      })));
    } catch (error: any) {
      toast.error("Failed to load form");
      console.error("Error loading form:", error);
    }
  };

  const saveForm = async (overrideStatus?: string) => {
    setIsSaving(true);
    try {
      const formData = {
        name: formName,
        description,
        slug,
        status: overrideStatus || status,
        settings,
        styling,
      };

      let savedFormId = currentFormId;

      if (currentFormId) {
        // Update existing form
        const { error: updateError } = await supabase
          .from("forms")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentFormId);

        if (updateError) throw updateError;

        // Delete existing fields
        const { error: deleteError } = await supabase
          .from("form_fields")
          .delete()
          .eq("form_id", currentFormId);

        if (deleteError) throw deleteError;
      } else {
        // Create new form
        const { data: userData } = await supabase.auth.getUser();
        const { data: newForm, error: createError } = await supabase
          .from("forms")
          .insert([{
            ...formData,
            user_id: userData.user?.id || '',
          }])
          .select()
          .single();

        if (createError) throw createError;
        savedFormId = newForm.id;
        setCurrentFormId(newForm.id);
      }

      // Insert fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((field, index) => ({
          form_id: savedFormId,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          help_text: field.help_text,
          required: field.required,
          position: index,
          options: field.options || [],
          validation: field.validation || {},
          conditional_logic: field.conditional_logic || {},
        }));

        const { error: fieldsError } = await supabase
          .from("form_fields")
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast.success("Form saved successfully");
    } catch (error: any) {
      toast.error("Failed to save form");
      console.error("Error saving form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFieldProperties = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        const updatedField = { ...field, ...updates };
        if (selectedField?.id === fieldId) {
          setSelectedField(updatedField);
        }
        return updatedField;
      }
      return field;
    }));
  };

  const handlePublish = async () => {
    const newStatus = status === 'published' ? 'draft' : 'published';
    setStatus(newStatus);
    await saveForm(newStatus);
  };

  const openPreview = () => {
    if (currentFormId && slug) {
      window.open(`/form/${slug}`, '_blank');
    } else {
      toast.error("Please save the form first");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 max-w-md">
            <Input
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (!currentFormId) {
                  setSlug(generateSlug(e.target.value));
                }
              }}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
              placeholder="Form Name"
            />
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0 mt-1"
              placeholder="form-slug"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            Settings
          </Button>
          <Button variant="outline" onClick={openPreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={() => saveForm()} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button 
            variant={status === 'published' ? 'destructive' : 'default'}
            onClick={handlePublish}
          >
            {status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <FormBuilderSidebar />

        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <FormBuilderCanvas
            fields={fields}
            selectedField={selectedField}
            onFieldsChange={setFields}
            onFieldSelect={setSelectedField}
          />
        </div>

        {/* Properties Panel */}
        {showSettings ? (
          <FormSettings
            settings={settings}
            styling={styling}
            onSettingsChange={setSettings}
            onStylingChange={setStyling}
            onClose={() => setShowSettings(false)}
          />
        ) : selectedField && (
          <FormFieldEditor
            field={selectedField}
            onUpdate={(updates) => updateFieldProperties(selectedField.id, updates)}
            onClose={() => setSelectedField(null)}
          />
        )}
      </div>
    </div>
  );
};
