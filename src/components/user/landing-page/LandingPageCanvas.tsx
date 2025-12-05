import { useState, useCallback } from "react";
import { HeroSection } from "./elements/HeroSection";
import { TextSection } from "./elements/TextSection";
import { ImageSection } from "./elements/ImageSection";
import { ButtonElement } from "./elements/ButtonElement";
import { FeatureGrid } from "./elements/FeatureGrid";
import { FormSection } from "./elements/FormSection";
import { VideoSection } from "./elements/VideoSection";
import { PricingTable } from "./elements/PricingTable";
import { FAQAccordion } from "./elements/FAQAccordion";
import { NavigationBar } from "./elements/NavigationBar";
import { FooterSection } from "./elements/FooterSection";
import { CountdownTimer } from "./elements/CountdownTimer";
import { DividerElement } from "./elements/DividerElement";
import { SectionContainer } from "./elements/SectionContainer";
import { ColumnElement } from "./elements/ColumnElement";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageElement {
  id: string;
  type: string;
  properties: any;
  position: number;
  parentId?: string | null;
  children?: PageElement[];
}

interface LandingPageCanvasProps {
  elements: PageElement[];
  onElementsChange: (elements: PageElement[]) => void;
  onSelectElement: (element: PageElement | null) => void;
  selectedElementId: string | null;
}

export const LandingPageCanvas = ({
  elements,
  onElementsChange,
  onSelectElement,
  selectedElementId,
}: LandingPageCanvasProps) => {
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  const updateElementRecursive = (els: PageElement[], targetId: string, newProps: any): PageElement[] => {
    return els.map(el => {
      if (el.id === targetId) {
        return { ...el, properties: { ...el.properties, ...newProps } };
      }
      if (el.children) {
        return { ...el, children: updateElementRecursive(el.children, targetId, newProps) };
      }
      return el;
    });
  };

  const renderElement = (element: PageElement): any => {
    const props = {
      ...element.properties,
      isEditing: true,
      onUpdate: (newProps: any) => {
        const updated = updateElementRecursive(elements, element.id, newProps);
        onElementsChange(updated);
      },
    };

    switch (element.type) {
      case "section":
        return (
          <SectionContainer {...props}>
            {element.children && element.children.length > 0 ? (
              element.children.map((child) => (
                <div key={child.id} onClick={(e) => { e.stopPropagation(); onSelectElement(child); }}>
                  {renderElement(child)}
                </div>
              ))
            ) : (
              Array.from({ length: props.columns || 1 }).map((_, idx) => (
                <ColumnElement key={idx} isEditing={true} />
              ))
            )}
          </SectionContainer>
        );
      case "column":
        return (
          <ColumnElement {...props}>
            {element.children?.map((child) => (
              <div key={child.id} onClick={(e) => { e.stopPropagation(); onSelectElement(child); }}>
                {renderElement(child)}
              </div>
            ))}
          </ColumnElement>
        );
      case "hero":
        return <HeroSection {...props} />;
      case "navbar":
        return <NavigationBar {...props} />;
      case "text":
        return <TextSection {...props} />;
      case "image":
        return <ImageSection {...props} />;
      case "video":
        return <VideoSection {...props} />;
      case "button":
        return <ButtonElement {...props} />;
      case "features":
        return <FeatureGrid {...props} />;
      case "pricing":
        return <PricingTable {...props} />;
      case "faq":
        return <FAQAccordion {...props} />;
      case "form":
        return <FormSection {...props} />;
      case "countdown":
        return <CountdownTimer {...props} />;
      case "footer":
        return <FooterSection {...props} />;
      case "divider":
        return <DividerElement {...props} />;
      case "spacer":
        return <div className="h-16 bg-transparent" />;
      default:
        return <div className="p-4 text-muted-foreground">Unknown element type</div>;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOverIndex(null);

    const elementType = e.dataTransfer.getData("application/landingpage");
    if (elementType) {
      const newElement: PageElement = {
        id: crypto.randomUUID(),
        type: elementType,
        properties: elementType === 'section' ? { columns: 2 } : {},
        position: index,
        parentId: null,
        children: elementType === 'section' ? [] : undefined,
      };

      const newElements = [...elements];
      newElements.splice(index, 0, newElement);
      newElements.forEach((el, idx) => el.position = idx);
      onElementsChange(newElements);
    }
  }, [elements, onElementsChange]);

  const deleteElement = (id: string) => {
    const filtered = elements.filter(el => el.id !== id);
    filtered.forEach((el, idx) => el.position = idx);
    onElementsChange(filtered);
    onSelectElement(null);
  };

  return (
    <div className="flex-1 bg-muted/30 overflow-y-auto">
      {elements.length === 0 ? (
        <div
          className="h-full flex items-center justify-center"
          onDragOver={(e) => handleDragOver(e, 0)}
          onDrop={(e) => handleDrop(e, 0)}
        >
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Your canvas is empty</p>
            <p className="text-sm">Drag elements from the sidebar to start building</p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`h-8 border-2 border-dashed transition-colors ${
              draggedOverIndex === 0 ? "border-primary bg-primary/10" : "border-transparent"
            }`}
            onDragOver={(e) => handleDragOver(e, 0)}
            onDrop={(e) => handleDrop(e, 0)}
          />
          {elements.map((element, index) => (
            <div key={element.id}>
              <div
                className={`relative group border-2 transition-colors ${
                  selectedElementId === element.id
                    ? "border-primary"
                    : "border-transparent hover:border-primary/50"
                }`}
                onClick={() => onSelectElement(element)}
              >
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(element.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-8 w-8 bg-background border rounded flex items-center justify-center cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {renderElement(element)}
              </div>
              <div
                className={`h-8 border-2 border-dashed transition-colors ${
                  draggedOverIndex === index + 1 ? "border-primary bg-primary/10" : "border-transparent"
                }`}
                onDragOver={(e) => handleDragOver(e, index + 1)}
                onDrop={(e) => handleDrop(e, index + 1)}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
};
