import React, { useState } from 'react';
import { X, Edit, Trash, Save, MapPin, Map, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Asset } from '../../lib/types';

interface AssetPanelProps {
  asset: Asset;
  onUpdate: (assetId: string, updates: Partial<Asset>) => void;
  onDelete: (assetId: string) => void;
  onClose: () => void;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({
  asset,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description || '');
  const [properties, setProperties] = useState<Record<string, any>>(asset.properties || {});
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  
  const handleSave = () => {
    onUpdate(asset.id, {
      name,
      description: description || undefined,
      properties
    });
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this asset? This cannot be undone.')) {
      onDelete(asset.id);
    }
  };
  
  const addProperty = () => {
    if (!newPropertyKey.trim()) return;
    
    setProperties(prev => ({
      ...prev,
      [newPropertyKey.trim()]: newPropertyValue
    }));
    
    setNewPropertyKey('');
    setNewPropertyValue('');
  };
  
  const removeProperty = (key: string) => {
    setProperties(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };
  
  // Format coordinates for display
  const formatCoordinates = () => {
    if (asset.geometry.type === 'Point') {
      const [lng, lat] = asset.geometry.coordinates;
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    return 'Multiple coordinates';
  };

  const photos = asset.photos || [];
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[currentPhotoIndex] : null;

  const nextPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  };

  const downloadPhoto = () => {
    if (currentPhoto) {
      // Create a download link
      const link = document.createElement('a');
      link.href = currentPhoto.data;
      link.download = currentPhoto.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Extract location from filename if available
  const getLocationFromFilename = (filename: string) => {
    // Pattern to match: assetId_lat_lng_photo_...
    const pattern = new RegExp(`${asset.id}_(-?\\d+\\.\\d+)_(-?\\d+\\.\\d+)_photo`);
    const match = filename.match(pattern);
    
    if (match && match.length >= 3) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    
    return null;
  };

  // Get location from current photo filename
  const photoLocation = currentPhoto ? getLocationFromFilename(currentPhoto.filename) : null;

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-blue-600 text-white">
        <h2 className="text-lg font-semibold flex items-center">
          {asset.assetType === 'marker' && <MapPin className="w-5 h-5 mr-2" />}
          {asset.assetType === 'polyline' && <Map className="w-5 h-5 mr-2" />}
          {asset.assetType === 'polygon' && <Map className="w-5 h-5 mr-2" />}
          {isEditing ? 'Edit Asset' : asset.name}
        </h2>
        <div className="flex items-center space-x-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-white hover:text-blue-200"
                title="Edit"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="text-white hover:text-blue-200"
                title="Delete"
              >
                <Trash className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Asset name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description (optional)"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Properties
              </label>
              
              <div className="mb-2 space-y-2">
                {Object.entries(properties).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProperty(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newPropertyKey}
                  onChange={(e) => setNewPropertyKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Property name"
                />
                <input
                  type="text"
                  value={newPropertyValue}
                  onChange={(e) => setNewPropertyValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Value"
                />
                <button
                  type="button"
                  onClick={addProperty}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Photo Gallery */}
            {hasPhotos && (
              <div className="mb-4">
                <div className="relative">
                  <div 
                    className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setShowPhotoGallery(true)}
                  >
                    <img 
                      src={currentPhoto?.data} 
                      alt={asset.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {photos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          prevPhoto();
                        }}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          nextPhoto();
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPhoto();
                    }}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full"
                    title="Download photo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {/* Show location from filename if available */}
                  {photoLocation && (
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {photoLocation.lat.toFixed(6)}, {photoLocation.lng.toFixed(6)}
                    </div>
                  )}
                </div>
                
                {photos.length > 1 && (
                  <div className="flex mt-2 overflow-x-auto space-x-2 pb-2">
                    {photos.map((photo, index) => (
                      <div 
                        key={photo.id}
                        className={`w-16 h-16 flex-shrink-0 cursor-pointer ${index === currentPhotoIndex ? 'ring-2 ring-blue-500' : 'opacity-70'}`}
                        onClick={() => setCurrentPhotoIndex(index)}
                      >
                        <img 
                          src={photo.data} 
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {asset.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Description</h3>
                <p className="text-gray-600">{asset.description}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Type</h3>
              <p className="text-gray-600 capitalize">{asset.assetType}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Coordinates</h3>
              <p className="text-gray-600">{formatCoordinates()}</p>
            </div>
            
            {asset.properties && Object.keys(asset.properties).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Properties</h3>
                <div className="bg-gray-50 rounded-md p-3 mt-1">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(asset.properties).map(([key, value]) => (
                        <tr key={key}>
                          <td className="font-medium pr-4 py-1 align-top">{key}</td>
                          <td className="text-gray-600 py-1">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Metadata</h3>
              <div className="bg-gray-50 rounded-md p-3 mt-1">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="font-medium pr-4 py-1">Created</td>
                      <td className="text-gray-600 py-1">
                        {new Date(asset.createdAt).toLocaleString()}
                      </td>
                    </tr>
                    {asset.updatedAt && (
                      <tr>
                        <td className="font-medium pr-4 py-1">Updated</td>
                        <td className="text-gray-600 py-1">
                          {new Date(asset.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="font-medium pr-4 py-1">Project ID</td>
                      <td className="text-gray-600 py-1">{asset.projectId}</td>
                    </tr>
                    <tr>
                      <td className="font-medium pr-4 py-1">Asset ID</td>
                      <td className="text-gray-600 py-1">{asset.id}</td>
                    </tr>
                    <tr>
                      <td className="font-medium pr-4 py-1">Photos</td>
                      <td className="text-gray-600 py-1">{photos.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Full-screen photo gallery */}
      {showPhotoGallery && hasPhotos && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[3000] flex items-center justify-center">
          <button
            onClick={() => setShowPhotoGallery(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative w-full max-w-4xl">
            <img 
              src={currentPhoto?.data} 
              alt={asset.name} 
              className="w-full max-h-[80vh] object-contain"
            />
            
            {photos.length > 1 && (
              <>
                <button 
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button 
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
              {currentPhotoIndex + 1} / {photos.length}
            </div>
            
            <button
              onClick={downloadPhoto}
              className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
              title="Download photo"
            >
              <Download className="w-6 h-6" />
            </button>
            
            {/* Display filename */}
            <div className="absolute top-4 left-16 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
              {currentPhoto?.filename || ""}
            </div>
            
            {/* Show location from filename if available */}
            {photoLocation && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-2 rounded-md text-sm flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {photoLocation.lat.toFixed(6)}, {photoLocation.lng.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};