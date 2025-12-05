interface DividerElementProps {
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  width?: number;
  margin?: number;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const DividerElement = ({
  style = 'solid',
  color = 'hsl(var(--border))',
  width = 100,
  margin = 32,
  isEditing,
  onUpdate,
}: DividerElementProps) => {
  return (
    <div
      className="flex items-center justify-center"
      style={{ paddingTop: `${margin}px`, paddingBottom: `${margin}px` }}
    >
      <hr
        className="border-0"
        style={{
          width: `${width}%`,
          height: '2px',
          backgroundColor: style === 'solid' ? color : 'transparent',
          borderTop: style !== 'solid' ? `2px ${style} ${color}` : 'none',
        }}
      />
    </div>
  );
};
