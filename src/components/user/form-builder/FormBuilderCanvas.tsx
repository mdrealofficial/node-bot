import { useState } from "react";
import { FormField } from "./FormBuilder";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FormBuilderCanvasProps {
  fields: FormField[];
  selectedField: FormField | null;
  onFieldsChange: (fields: FormField[]) => void;
  onFieldSelect: (field: FormField | null) => void;
}

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  renderFieldPreview: (field: FormField) => React.ReactNode;
}

const SortableField = ({ field, isSelected, onSelect, onDelete, renderFieldPreview }: SortableFieldProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:bg-accent"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
        </div>
        <div className="flex-1 space-y-2">
          {field.field_type !== 'heading' && field.field_type !== 'divider' && (
            <div className="flex items-center gap-2">
              <Label className="font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
          )}
          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
          {renderFieldPreview(field)}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export const FormBuilderCanvas = ({
  fields,
  selectedField,
  onFieldsChange,
  onFieldSelect,
}: FormBuilderCanvasProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      onFieldsChange(arrayMove(fields, oldIndex, newIndex));
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const fieldType = e.dataTransfer.getData("fieldType");
    if (!fieldType) return;

    const newField: FormField = {
      id: `field-${Date.now()}`,
      field_type: fieldType,
      label: getDefaultLabel(fieldType),
      placeholder: getDefaultPlaceholder(fieldType),
      required: false,
      position: index,
      options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox' 
        ? ['Option 1', 'Option 2', 'Option 3'] 
        : undefined,
    };

    const newFields = [...fields];
    newFields.splice(index, 0, newField);
    onFieldsChange(newFields);
    
    // Clear the drag data
    e.dataTransfer.clearData();
  };

  const getDefaultLabel = (type: string): string => {
    const labels: Record<string, string> = {
      text: "Text Field",
      email: "Email Address",
      phone: "Phone Number",
      number: "Number",
      textarea: "Text Area",
      select: "Dropdown",
      radio: "Radio Buttons",
      checkbox: "Checkboxes",
      date: "Date",
      file: "File Upload",
      rating: "Rating",
      hidden: "Hidden Field",
      heading: "Section Heading",
      divider: "Divider",
    };
    return labels[type] || "Field";
  };

  const getDefaultPlaceholder = (type: string): string => {
    const placeholders: Record<string, string> = {
      text: "Enter text...",
      email: "your@email.com",
      phone: "+1234567890",
      number: "Enter number...",
      textarea: "Enter your message...",
    };
    return placeholders[type] || "";
  };

  const deleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      onFieldSelect(null);
    }
  };

  const renderFieldPreview = (field: FormField) => {
    const commonProps = {
      className: "w-full",
      placeholder: field.placeholder,
    };

    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return <Input {...commonProps} type={field.field_type} disabled />;
      
      case "textarea":
        return <Textarea {...commonProps} disabled />;
      
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option, i) => (
                <SelectItem key={i} value={`option-${i}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "radio":
        return (
          <RadioGroup disabled>
            {(field.options || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={`option-${i}`} id={`${field.id}-${i}`} />
                <Label htmlFor={`${field.id}-${i}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case "checkbox":
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox id={`${field.id}-${i}`} disabled />
                <Label htmlFor={`${field.id}-${i}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      
      case "date":
        return <Input type="date" disabled />;
      
      case "file":
        return <Input type="file" disabled />;
      
      case "rating":
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-2xl text-gray-300">★</span>
            ))}
          </div>
        );
      
      case "heading":
        return <h3 className="text-xl font-semibold">{field.label}</h3>;
      
      case "divider":
        return <Separator />;
      
      case "hidden":
        return (
          <div className="text-sm text-muted-foreground italic">
            Hidden field: {field.label}
          </div>
        );
      
      default:
        return <Input {...commonProps} disabled />;
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Form Preview</h2>
          <p className="text-muted-foreground">Drag fields from the sidebar to add them</p>
        </div>

        {fields.length === 0 ? (
          <div
            className="border-2 border-dashed border-primary/40 rounded-lg p-12 text-center bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all"
            onDragOver={(e) => handleDragOver(e, 0)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 0)}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Drop fields here to start building
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag any field from the left sidebar and drop it here
                </p>
              </div>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2">
                    <SortableField
                      field={field}
                      isSelected={selectedField?.id === field.id}
                      onSelect={() => onFieldSelect(field)}
                      onDelete={() => deleteField(field.id)}
                      renderFieldPreview={renderFieldPreview}
                    />

                    {/* Drop zone between fields - invisible by default */}
                    <div
                      className={`transition-all flex items-center justify-center ${
                        dragOverIndex === index + 1
                          ? "h-12 bg-primary/20 border-primary rounded-lg border-2 border-dashed"
                          : "h-2"
                      }`}
                      onDragOver={(e) => handleDragOver(e, index + 1)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index + 1)}
                    >
                      {dragOverIndex === index + 1 && (
                        <span className="text-xs font-medium text-primary">
                          Drop here
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </Card>
    </div>
  );
};
