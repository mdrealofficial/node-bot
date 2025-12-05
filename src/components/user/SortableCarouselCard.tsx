import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface CardButton {
  id: string;
  title: string;
}

interface Card {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: CardButton[];
}

interface SortableCarouselCardProps {
  card: Card;
  index: number;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
  onAddButton: (index: number) => void;
  onRemoveButton: (cardIndex: number, buttonIndex: number) => void;
  onUpdateButton: (cardIndex: number, buttonIndex: number, title: string) => void;
}

export const SortableCarouselCard = ({
  card,
  index,
  onUpdate,
  onRemove,
  onAddButton,
  onRemoveButton,
  onUpdateButton,
}: SortableCarouselCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3 bg-background"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium">Card {index + 1}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(index)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <Label>Title *</Label>
        <Input
          value={card.title}
          onChange={(e) => onUpdate(index, 'title', e.target.value.slice(0, 80))}
          placeholder="Card title"
        />
      </div>

      <div>
        <Label>Subtitle</Label>
        <Input
          value={card.subtitle || ""}
          onChange={(e) => onUpdate(index, 'subtitle', e.target.value.slice(0, 80))}
          placeholder="Card subtitle (optional)"
        />
      </div>

      <ImageUpload
        value={card.imageUrl || ""}
        onChange={(url) => onUpdate(index, 'imageUrl', url)}
        label="Image"
        placeholder="https://example.com/image.jpg"
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Buttons (max 3)</Label>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onAddButton(index)}
            type="button"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {card.buttons?.map((btn, btnIndex) => (
            <div key={btn.id} className="flex gap-2">
              <Input
                value={btn.title}
                onChange={(e) => onUpdateButton(index, btnIndex, e.target.value)}
                placeholder="Button text"
                maxLength={20}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveButton(index, btnIndex)}
                type="button"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
