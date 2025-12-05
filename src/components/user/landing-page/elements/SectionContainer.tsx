import { ReactNode } from "react";

interface SectionContainerProps {
  columns?: number;
  columnRatios?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  gap?: number;
  containerWidth?: 'full' | 'boxed';
  verticalAlign?: 'top' | 'center' | 'bottom';
  children?: ReactNode;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const SectionContainer = ({
  columns = 1,
  columnRatios = 'equal',
  backgroundColor = 'transparent',
  backgroundImage,
  backgroundOverlay = 0,
  paddingTop = 8,
  paddingBottom = 8,
  paddingLeft = 4,
  paddingRight = 4,
  gap = 4,
  containerWidth = 'boxed',
  verticalAlign = 'top',
  children,
  isEditing,
  onUpdate,
}: SectionContainerProps) => {
  
  const getColumnClasses = () => {
    if (columnRatios === 'equal') {
      // Use explicit Tailwind classes instead of dynamic interpolation
      const columnClassMap: { [key: number]: string } = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-4',
      };
      return columnClassMap[columns] || 'grid-cols-1';
    }
    // Handle custom ratios with grid-flow
    return 'grid-cols-1 md:grid-flow-col md:auto-cols-fr';
  };

  const alignmentMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const overlayStyle: React.CSSProperties = backgroundImage && backgroundOverlay > 0 ? {
    backgroundColor: `rgba(0, 0, 0, ${backgroundOverlay / 100})`,
  } : {};

  const getAlignmentClass = () => {
    return alignmentMap[verticalAlign] || 'items-start';
  };

  return (
    <section 
      className="relative w-full" 
      style={backgroundStyle}
    >
      {backgroundImage && backgroundOverlay > 0 && (
        <div className="absolute inset-0" style={overlayStyle} />
      )}
      <div 
        className={`relative ${containerWidth === 'boxed' ? 'max-w-7xl mx-auto' : 'w-full'}`}
        style={{
          paddingTop: `${paddingTop * 0.25}rem`,
          paddingBottom: `${paddingBottom * 0.25}rem`,
          paddingLeft: `${paddingLeft * 0.25}rem`,
          paddingRight: `${paddingRight * 0.25}rem`,
        }}
      >
        <div 
          className={`grid ${getColumnClasses()} ${getAlignmentClass()}`}
          style={{ gap: `${gap * 0.25}rem` }}
        >
          {children}
        </div>
      </div>
      {isEditing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/30 pointer-events-none" />
      )}
    </section>
  );
};