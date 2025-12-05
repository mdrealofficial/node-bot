interface ButtonElementProps {
  text?: string;
  link?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  alignment?: 'left' | 'center' | 'right';
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const ButtonElement = ({
  text = "Click Here",
  link = "#",
  variant = "primary",
  alignment = "center",
  isEditing,
  onUpdate,
}: ButtonElementProps) => {
  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    outline: "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
  };

  const alignmentClass = alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";

  return (
    <div className={`px-4 py-8 flex ${alignmentClass}`}>
      <button className={`px-6 py-3 rounded-lg transition-colors font-semibold ${variantStyles[variant]}`}>
        {text}
      </button>
    </div>
  );
};
