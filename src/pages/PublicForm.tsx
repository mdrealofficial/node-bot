import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder?: string;
  help_text?: string;
  required: boolean;
  options?: any[];
  validation?: any;
}

const PublicForm = () => {
  const { slug } = useParams();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (slug) {
      loadForm();
    }
  }, [slug]);

  const loadForm = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (formError) throw formError;

      if (!formData) {
        toast.error("Form not found or not published");
        return;
      }

      setForm(formData);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formData.id)
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = fields.filter(f => f.required && f.field_type !== 'heading' && f.field_type !== 'divider');
      const missingFields = requiredFields.filter(f => !formData[f.id] || formData[f.id] === '');

      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
        setSubmitting(false);
        return;
      }

      // Submit form
      const { error } = await supabase
        .from("form_submissions")
        .insert({
          form_id: form.id,
          data: formData,
          visitor_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Form submitted successfully!");

      // Redirect if URL is set
      if (form.settings?.redirectUrl) {
        setTimeout(() => {
          window.location.href = form.settings.redirectUrl;
        }, 2000);
      }
    } catch (error: any) {
      toast.error("Failed to submit form");
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';

    const updateValue = (newValue: any) => {
      setFormData({ ...formData, [field.id]: newValue });
    };

    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <Input
            type={field.field_type}
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );

      case "select":
        return (
          <Select value={value} onValueChange={updateValue} required={field.required}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option, i) => (
                <SelectItem key={i} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <RadioGroup value={value} onValueChange={updateValue} required={field.required}>
            {(field.options || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${i}`} />
                <Label htmlFor={`${field.id}-${i}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        const checkboxValues = value || [];
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${i}`}
                  checked={checkboxValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateValue([...checkboxValues, option]);
                    } else {
                      updateValue(checkboxValues.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${i}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            required={field.required}
          />
        );

      case "file":
        return (
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) updateValue(file.name);
            }}
            required={field.required}
          />
        );

      case "rating":
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => updateValue(star)}
                className={`text-3xl ${value >= star ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        );

      case "heading":
        return <h3 className="text-xl font-semibold">{field.label}</h3>;

      case "divider":
        return <Separator />;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
          <p className="text-muted-foreground">
            This form does not exist or is not currently published.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {form.settings?.successMessage || "Your submission has been received."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <Card className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{form.name}</h1>
          {form.description && (
            <p className="text-muted-foreground">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              {field.field_type !== 'heading' && field.field_type !== 'divider' ? (
                <div className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.help_text && (
                    <p className="text-sm text-muted-foreground">{field.help_text}</p>
                  )}
                  {renderField(field)}
                </div>
              ) : (
                renderField(field)
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              form.settings?.submitButtonText || "Submit"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default PublicForm;
