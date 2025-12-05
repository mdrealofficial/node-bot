import { FormField } from "./FormBuilder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormFieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export const FormFieldEditor = ({ field, onUpdate, onClose }: FormFieldEditorProps) => {
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.field_type);

  const addOption = () => {
    const currentOptions = field.options || [];
    onUpdate({
      options: [...currentOptions, `Option ${currentOptions.length + 1}`]
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    onUpdate({ options: newOptions });
  };

  return (
    <div className="w-96 border-l bg-card">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="font-semibold">Field Properties</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-6 space-y-6">
          {/* Label */}
          {field.field_type !== 'divider' && (
            <div className="space-y-2">
              <Label>Field Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Enter field label"
              />
            </div>
          )}

          {/* Placeholder */}
          {['text', 'email', 'phone', 'number', 'textarea'].includes(field.field_type) && (
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
          )}

          {/* Help Text */}
          {field.field_type !== 'divider' && field.field_type !== 'heading' && (
            <div className="space-y-2">
              <Label>Help Text</Label>
              <Textarea
                value={field.help_text || ""}
                onChange={(e) => onUpdate({ help_text: e.target.value })}
                placeholder="Add helpful description"
                rows={2}
              />
            </div>
          )}

          {/* Required Toggle */}
          {field.field_type !== 'divider' && field.field_type !== 'heading' && (
            <div className="flex items-center justify-between">
              <Label>Required Field</Label>
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onUpdate({ required: checked })}
              />
            </div>
          )}

          {/* Options for Select/Radio/Checkbox */}
          {hasOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button size="sm" variant="outline" onClick={addOption}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {(field.options || []).map((option, index) => (
                  <Card key={index} className="p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Validation Rules */}
          {field.field_type === 'text' && (
            <div className="space-y-3">
              <Label>Validation</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-sm">Min Length</Label>
                  <Input
                    type="number"
                    value={field.validation?.minLength || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, minLength: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-sm">Max Length</Label>
                  <Input
                    type="number"
                    value={field.validation?.maxLength || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, maxLength: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Number Validation */}
          {field.field_type === 'number' && (
            <div className="space-y-3">
              <Label>Validation</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-sm">Min Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.min || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, min: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 text-sm">Max Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.max || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, max: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* File Upload Settings */}
          {field.field_type === 'file' && (
            <div className="space-y-3">
              <Label>File Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-32 text-sm">Max Size (MB)</Label>
                  <Input
                    type="number"
                    value={field.validation?.maxSize || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, maxSize: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Allowed Types</Label>
                  <Input
                    value={field.validation?.allowedTypes || ""}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, allowedTypes: e.target.value }
                    })}
                    placeholder=".pdf,.doc,.jpg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
