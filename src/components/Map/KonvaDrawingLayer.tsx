import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';

interface KonvaDrawingLayerProps {
  width: number;
  height: number;
  onPolygonComplete: (points: number[][]) => void;
  isActive: boolean;
}

const KonvaDrawingLayer: React.FC<KonvaDrawingLayerProps> = ({ 
  width, 
  height, 
  onPolygonComplete,
  isActive
}) => {
  const [points, setPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  
  // Reset drawing when component becomes inactive
  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      setIsDrawing(false);
    }
  }, [isActive]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isActive) return;
    
    // Get click position relative to the stage
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    // Add point to the array
    const newPoints = [...points, pointerPosition.x, pointerPosition.y];
    setPoints(newPoints);
    
    // Start drawing after first point
    if (!isDrawing) {
      setIsDrawing(true);
    }
  };

  const handleStageDoubleClick = () => {
    if (!isActive || !isDrawing || points.length < 6) return; // Need at least 3 points (6 coordinates)
    
    // Close the polygon by adding the first point again
    const closedPoints = [...points];
    
    // Convert flat array to array of [x, y] coordinates
    const coordinates: number[][] = [];
    for (let i = 0; i < closedPoints.length; i += 2) {
      coordinates.push([closedPoints[i], closedPoints[i + 1]]);
    }
    
    // Add the first point to close the polygon if it's not already closed
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push([...firstPoint]);
    }
    
    // Call the callback with the coordinates
    onPolygonComplete(coordinates);
    
    // Reset the drawing
    setPoints([]);
    setIsDrawing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel drawing on Escape key
      setPoints([]);
      setIsDrawing(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: isActive ? 1000 : -1
      }}
    >
      <Stage 
        width={width} 
        height={height} 
        onClick={handleStageClick}
        onDblClick={handleStageDoubleClick}
        ref={stageRef}
      >
        <Layer>
          {/* Draw the polygon lines */}
          {points.length >= 4 && (
            <Line
              points={points}
              stroke="#3388ff"
              strokeWidth={2}
              closed={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
          
          {/* Draw a dashed line back to the first point if we have at least 2 points */}
          {points.length >= 4 && (
            <Line
              points={[
                points[points.length - 2],
                points[points.length - 1],
                points[0],
                points[1]
              ]}
              stroke="#3388ff"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.6}
            />
          )}
          
          {/* Draw circles at each vertex */}
          {points.length > 0 && Array.from({ length: points.length / 2 }).map((_, i) => (
            <Circle
              key={i}
              x={points[i * 2]}
              y={points[i * 2 + 1]}
              radius={4}
              fill="#3388ff"
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
        </Layer>
      </Stage>
      
      {isActive && isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md text-sm">
          Click to add points, double-click to complete the polygon
        </div>
      )}
    </div>
  );
};

export default KonvaDrawingLayer;