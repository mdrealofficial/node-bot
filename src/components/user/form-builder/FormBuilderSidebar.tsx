import { 
  Type, 
  Mail, 
  Phone, 
  Hash, 
  AlignLeft, 
  ChevronDown, 
  Square, 
  Circle,
  Calendar,
  Upload,
  Star,
  EyeOff,
  Heading1,
  Minus
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

const fieldTypes = [
  {
    type: "text",
    icon: Type,
    label: "Text Input",
    description: "Single line text",
    category: "input"
  },
  {
    type: "email",
    icon: Mail,
    label: "Email",
    description: "Email address",
    category: "input"
  },
  {
    type: "phone",
    icon: Phone,
    label: "Phone",
    description: "Phone number",
    category: "input"
  },
  {
    type: "number",
    icon: Hash,
    label: "Number",
    description: "Numeric input",
    category: "input"
  },
  {
    type: "textarea",
    icon: AlignLeft,
    label: "Text Area",
    description: "Multi-line text",
    category: "input"
  },
  {
    type: "select",
    icon: ChevronDown,
    label: "Dropdown",
    description: "Select from list",
    category: "selection"
  },
  {
    type: "radio",
    icon: Circle,
    label: "Radio Buttons",
    description: "Single choice",
    category: "selection"
  },
  {
    type: "checkbox",
    icon: Square,
    label: "Checkboxes",
    description: "Multiple choices",
    category: "selection"
  },
  {
    type: "date",
    icon: Calendar,
    label: "Date Picker",
    description: "Date selection",
    category: "special"
  },
  {
    type: "file",
    icon: Upload,
    label: "File Upload",
    description: "Upload files",
    category: "special"
  },
  {
    type: "rating",
    icon: Star,
    label: "Rating",
    description: "Star rating",
    category: "special"
  },
  {
    type: "hidden",
    icon: EyeOff,
    label: "Hidden Field",
    description: "Hidden value",
    category: "special"
  },
  {
    type: "heading",
    icon: Heading1,
    label: "Heading",
    description: "Section title",
    category: "layout"
  },
  {
    type: "divider",
    icon: Minus,
    label: "Divider",
    description: "Horizontal line",
    category: "layout"
  }
];

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "input":
      return "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300";
    case "selection":
      return "bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300";
    case "special":
      return "bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900 text-green-700 dark:text-green-300";
    case "layout":
      return "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300";
    default:
      return "bg-card hover:bg-accent";
  }
};

export const FormBuilderSidebar = () => {
  const handleDragStart = (e: React.DragEvent, fieldType: string) => {
    e.dataTransfer.setData("fieldType", fieldType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-80 border-r bg-card p-6 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Form Fields</h2>
        <p className="text-sm text-muted-foreground">Drag fields to the canvas</p>
      </div>

      <div className="space-y-2">
        {fieldTypes.map((field) => {
          const Icon = field.icon;
          return (
            <TooltipProvider key={field.type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.type)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 cursor-move transition-all ${getCategoryStyles(field.category)}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{field.label}</div>
                        <div className="text-xs opacity-70 truncate">
                          {field.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{field.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
