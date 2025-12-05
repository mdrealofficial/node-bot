import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FormSectionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  fields?: Array<{ name: string; type: string; placeholder: string; required: boolean }>;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const FormSection = ({
  title = "Get in Touch",
  description = "Fill out the form below and we'll get back to you",
  buttonText = "Submit",
  fields = [
    { name: "name", type: "text", placeholder: "Your Name", required: true },
    { name: "email", type: "email", placeholder: "Your Email", required: true },
    { name: "message", type: "textarea", placeholder: "Your Message", required: true },
  ],
  isEditing,
  onUpdate,
}: FormSectionProps) => {
  return (
    <div className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-foreground">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="bg-background rounded-lg p-8 shadow-lg border space-y-4">
          {fields.map((field, index) => (
            <div key={index}>
              {field.type === "textarea" ? (
                <Textarea placeholder={field.placeholder} required={field.required} />
              ) : (
                <Input type={field.type} placeholder={field.placeholder} required={field.required} />
              )}
            </div>
          ))}
          <Button className="w-full">{buttonText}</Button>
        </div>
      </div>
    </div>
  );
};
