import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';

export const MeasurementTool: React.FC = () => {
  const [measurements, setMeasurements] = useState<string[]>([]);
  
  // This is a placeholder component
  // In a real implementation, this would interact with the map
  // to measure distances and areas

  return (
    <div className="absolute top-4 left-16 z-[1000] bg-white rounded-lg shadow-lg p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium flex items-center">
          <Ruler className="w-5 h-5 mr-2" />
          Measurement Tool
        </h3>
        <button
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Measure Distance
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Measure Area
          </button>
        </div>
        
        <div className="border-t pt-2">
          <h4 className="font-medium mb-2">Results</h4>
          {measurements.length > 0 ? (
            <ul className="space-y-1">
              {measurements.map((measurement, index) => (
                <li key={index} className="text-sm">
                  {measurement}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Click on the map to start measuring
            </p>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          <p>Click points on the map to measure.</p>
          <p>Double-click to finish measurement.</p>
        </div>
      </div>
    </div>
  );
};