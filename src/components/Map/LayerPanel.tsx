import React from 'react';
import { X, Eye, EyeOff, Trash2, Layers } from 'lucide-react';
import { Layer } from '../../lib/types';

interface LayerPanelProps {
  layers: Layer[];
  onToggleVisibility: (layerId: string, visible: boolean) => void;
  onDelete: (layerId: string) => void;
  onClose: () => void;
}

export function LayerPanel({ layers, onToggleVisibility, onDelete, onClose }: LayerPanelProps) {
  return (
    <div className="absolute top-4 left-16 z-[1000] bg-white rounded-lg shadow-lg w-64">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-gray-700 flex items-center">
          <Layers className="w-4 h-4 mr-2" />
          Layers
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      <div className="p-2 max-h-80 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No layers yet</p>
            <p className="text-xs mt-1">Use the Layer Manager to add layers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {layers.map(layer => (
              <div 
                key={layer.id}
                className={`p-3 rounded-lg border ${
                  layer.visible ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div 
                      className="w-5 h-5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: layer.style?.color || '#3388ff' }}
                    />
                    <span className="text-sm font-medium truncate" title={layer.name}>
                      {layer.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => onToggleVisibility(layer.id, !layer.visible)}
                      className={`p-1.5 rounded-full ${
                        layer.visible ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the layer "${layer.name}"?`)) {
                          onDelete(layer.id);
                        }
                      }}
                      className="p-1.5 rounded-full text-red-600 hover:bg-red-100"
                      title="Delete layer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {layer.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate" title={layer.description}>
                    {layer.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}