import { ReactNode } from "react";

interface ColumnElementProps {
  backgroundColor?: string;
  padding?: number;
  verticalAlign?: 'top' | 'center' | 'bottom';
  children?: ReactNode;
  isEditing?: boolean;
  isDropZone?: boolean;
  onUpdate?: (properties: any) => void;
}

export const ColumnElement = ({
  backgroundColor = 'transparent',
  padding = 4,
  verticalAlign = 'top',
  children,
  isEditing,
  isDropZone,
  onUpdate,
}: ColumnElementProps) => {
  
  const getAlignmentClass = () => {
    const alignmentMap: { [key: string]: string } = {
      top: 'justify-start',
      center: 'justify-center',
      bottom: 'justify-end',
    };
    return alignmentMap[verticalAlign] || 'justify-start';
  };

  return (
    <div 
      className={`flex flex-col ${getAlignmentClass()} min-h-[100px] ${
        isEditing ? 'border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors' : ''
      } ${isDropZone ? 'bg-primary/5' : ''}`}
      style={{
        backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
        padding: `${padding * 0.25}rem`,
      }}
    >
      {children || (isEditing && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">
          Drop elements here
        </div>
      ))}
    </div>
  );
};