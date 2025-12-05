import { useCallback } from 'react';
import { EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { Scissors } from 'lucide-react';

export const ScissorsEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [id, setEdges]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={onEdgeClick}
              className="flex items-center justify-center w-8 h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer border-2 border-background"
              title="Cut connection"
            >
              <Scissors className="h-4 w-4" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
