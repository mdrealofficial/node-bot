import { Check } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon?: string;
}

interface FeatureGridProps {
  title?: string;
  features?: Feature[];
  columns?: number;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const FeatureGrid = ({
  title = "Features",
  features = [
    { title: "Feature 1", description: "Description for feature 1" },
    { title: "Feature 2", description: "Description for feature 2" },
    { title: "Feature 3", description: "Description for feature 3" },
  ],
  columns = 3,
  isEditing,
  onUpdate,
}: FeatureGridProps) => {
  const gridColsClass = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  
  return (
    <div className="px-4 py-16 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          {title}
        </h2>
        <div className={`grid grid-cols-1 ${gridColsClass} gap-8`}>
          {features.map((feature, index) => (
            <div key={index} className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
