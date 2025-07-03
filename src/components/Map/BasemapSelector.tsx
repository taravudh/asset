import React from 'react';
import { X } from 'lucide-react';

interface BasemapSelectorProps {
  currentBasemap: string;
  onSelectBasemap: (basemap: string) => void;
  onClose: () => void;
}

export const BasemapSelector: React.FC<BasemapSelectorProps> = ({
  currentBasemap,
  onSelectBasemap,
  onClose
}) => {
  const basemaps = [
    {
      id: 'OpenStreetMap',
      name: 'OpenStreetMap',
      thumbnail: 'https://a.tile.openstreetmap.org/7/63/42.png',
      description: 'Standard street map with detailed roads and landmarks'
    },
    {
      id: 'GoogleSatellite',
      name: 'Google Satellite',
      thumbnail: 'https://mt1.google.com/vt/lyrs=s&x=63&y=42&z=7',
      description: 'Satellite imagery without labels'
    },
    {
      id: 'GoogleHybrid',
      name: 'Google Hybrid',
      thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=63&y=42&z=7',
      description: 'Satellite imagery with road and label overlays'
    },
    {
      id: 'CartoDB',
      name: 'CartoDB Light',
      thumbnail: 'https://a.basemaps.cartocdn.com/light_all/7/63/42.png',
      description: 'Clean, light basemap for data visualization'
    }
  ];

  return (
    <div className="absolute top-4 left-16 z-[1000] bg-white rounded-lg shadow-lg p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Select Basemap</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-3">
        {basemaps.map((basemap) => (
          <div
            key={basemap.id}
            className={`flex items-start p-2 rounded-lg cursor-pointer transition-colors ${
              currentBasemap === basemap.id
                ? 'bg-blue-100 border border-blue-300'
                : 'hover:bg-gray-100 border border-transparent'
            }`}
            onClick={() => onSelectBasemap(basemap.id)}
          >
            <img
              src={basemap.thumbnail}
              alt={basemap.name}
              className="w-16 h-16 object-cover rounded mr-3"
            />
            <div>
              <h4 className="font-medium">{basemap.name}</h4>
              <p className="text-xs text-gray-600">{basemap.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};