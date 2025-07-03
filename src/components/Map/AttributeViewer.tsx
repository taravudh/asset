import React from 'react';
import { X, Info, Camera } from 'lucide-react';
import { Asset } from '../../lib/types';

interface AttributeViewerProps {
  asset: Asset;
  position: { x: number; y: number };
  onClose: () => void;
  onViewDetails: () => void;
}

export const AttributeViewer: React.FC<AttributeViewerProps> = ({
  asset,
  position,
  onClose,
  onViewDetails
}) => {
  const hasPhotos = asset.photos && asset.photos.length > 0;
  const firstPhoto = hasPhotos ? asset.photos[0] : null;

  return (
    <div
      className="absolute z-[1500] bg-black rounded-lg shadow-lg p-3 w-64"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        marginTop: '-10px'
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-white">{asset.name}</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Show first photo if available */}
      {firstPhoto && (
        <div className="mb-2 rounded-md overflow-hidden">
          <img 
            src={firstPhoto.data} 
            alt={asset.name} 
            className="w-full h-24 object-cover"
          />
          {asset.photos && asset.photos.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
              +{asset.photos.length - 1}
            </div>
          )}
        </div>
      )}
      
      {asset.description && (
        <p className="text-sm text-white mb-2">{asset.description}</p>
      )}
      
      {asset.properties && Object.keys(asset.properties).length > 0 && (
        <div className="mb-2">
          <h4 className="text-xs font-medium text-white mb-1">Properties</h4>
          <div className="space-y-1">
            {Object.entries(asset.properties).slice(0, 3).map(([key, value]) => (
              <div key={key} className="text-xs text-white">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
            {Object.keys(asset.properties).length > 3 && (
              <div className="text-xs text-blue-400">
                +{Object.keys(asset.properties).length - 3} more properties
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        {hasPhotos && (
          <div className="text-xs flex items-center text-white">
            <Camera className="w-3 h-3 mr-1" />
            <span>{asset.photos?.length} photo{asset.photos?.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        <button
          onClick={onViewDetails}
          className="text-xs flex items-center text-blue-400 hover:text-blue-300 ml-auto"
        >
          <Info className="w-3 h-3 mr-1" />
          View Details
        </button>
      </div>
      
      <div className="absolute w-3 h-3 bg-black transform rotate-45 left-1/2 -ml-1.5 -bottom-1.5 border-r border-b border-gray-800"></div>
    </div>
  );
};