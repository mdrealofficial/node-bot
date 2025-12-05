interface TextSectionProps {
  content?: string;
  alignment?: 'left' | 'center' | 'right';
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const TextSection = ({
  content = "Add your text content here. Click to edit.",
  alignment = "left",
  isEditing,
  onUpdate,
}: TextSectionProps) => {
  const alignmentClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  
  return (
    <div className={`px-4 py-8 ${alignmentClass}`}>
      <div className="max-w-4xl mx-auto prose prose-lg text-foreground">
        <p>{content}</p>
      </div>
    </div>
  );
};
