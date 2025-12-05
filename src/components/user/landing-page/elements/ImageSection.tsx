import { Image as ImageIcon } from "lucide-react";

interface ImageSectionProps {
  imageUrl?: string;
  caption?: string;
  alt?: string;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const ImageSection = ({
  imageUrl,
  caption,
  alt = "Image",
  isEditing,
  onUpdate,
}: ImageSectionProps) => {
  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto rounded-lg shadow-lg"
          />
        ) : (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        {caption && (
          <p className="text-center text-muted-foreground mt-4">{caption}</p>
        )}
      </div>
    </div>
  );
};
