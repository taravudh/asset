import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Camera, Image, Trash, Plus, Download, MapPin } from 'lucide-react';
import { Asset, Layer, AssetPhoto } from '../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import CameraCapture from './CameraCapture';

interface AssetFormModalProps {
  geometry: any;
  onSave: (assetData: Partial<Asset>) => void;
  onCancel: () => void;
  projectId: string;
  layerId: string;
  asset?: Asset; // For editing existing assets
  activeLayer?: Layer | null; // The currently active layer
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  geometry,
  onSave,
  onCancel,
  projectId,
  layerId,
  asset,
  activeLayer
}) => {
  // CRITICAL: Generate asset ID at the very beginning to ensure consistency
  // Use existing asset ID or generate a new one
  const assetId = asset?.id || uuidv4();
  
  const [name, setName] = useState(asset?.name || '');
  const [description, setDescription] = useState(asset?.description || '');
  const [properties, setProperties] = useState<Record<string, string>>(
    asset?.properties || {}
  );
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<AssetPhoto[]>(asset?.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState<boolean | null>(null);
  
  // Initialize properties with custom fields from the active layer
  useEffect(() => {
    if (activeLayer?.customFields && activeLayer.customFields.length > 0 && !asset) {
      const initialProperties: Record<string, string> = {};
      activeLayer.customFields.forEach(field => {
        initialProperties[field.name] = '';
      });
      setProperties(prev => ({...prev, ...initialProperties}));
    }
  }, [activeLayer, asset]);

  // Get location from geometry if it's a Point
  useEffect(() => {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      setLocation({ lat, lng });
      
      // Add location to properties
      setProperties(prev => ({
        ...prev,
        latitude: lat.toString(),
        longitude: lng.toString()
      }));
    }
  }, [geometry]);

  // Check if camera is available - simplified check without actually accessing camera
  useEffect(() => {
    const checkCameraAvailability = () => {
      try {
        // Simply check if the APIs exist without actually requesting camera access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          setIsCameraAvailable(true);
        } else {
          setIsCameraAvailable(false);
        }
      } catch (err) {
        console.error('Error checking camera availability:', err);
        setIsCameraAvailable(false);
      }
    };
    
    checkCameraAvailability();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Please enter a name for this asset';
    }
    
    // Validate required custom fields
    if (activeLayer?.customFields) {
      activeLayer.customFields.forEach(field => {
        if (field.required && (!properties[field.name] || properties[field.name].trim() === '')) {
          errors[field.name] = `${field.name} is required`;
        }
      });
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Prepare asset data
    const assetData: Partial<Asset> = {
      id: assetId, // Use the consistent asset ID
      name: name.trim(),
      description: description.trim() || undefined,
      properties,
      projectId,
      layerId,
      photos
    };
    
    onSave(assetData);
  };
  
  const addProperty = () => {
    if (!newPropertyKey.trim()) {
      setValidationErrors({...validationErrors, newProperty: 'Please enter a property name'});
      return;
    }
    
    setProperties(prev => ({
      ...prev,
      [newPropertyKey.trim()]: newPropertyValue
    }));
    
    setNewPropertyKey('');
    setNewPropertyValue('');
    setValidationErrors({...validationErrors, newProperty: ''});
  };
  
  const removeProperty = (key: string) => {
    // Don't allow removing required custom fields
    const isRequiredField = activeLayer?.customFields?.some(
      field => field.name === key && field.required
    );
    
    if (isRequiredField) {
      setValidationErrors({...validationErrors, [key]: 'This field is required and cannot be removed'});
      return;
    }
    
    // Don't allow removing latitude/longitude if they exist
    if ((key === 'latitude' || key === 'longitude') && location) {
      setValidationErrors({...validationErrors, [key]: 'Location coordinates cannot be removed'});
      return;
    }
    
    setProperties(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };
  
  const updateProperty = (key: string, value: string) => {
    setProperties(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear validation error if value is provided
    if (value.trim() !== '' && validationErrors[key]) {
      const updatedErrors = {...validationErrors};
      delete updatedErrors[key];
      setValidationErrors(updatedErrors);
    }
  };

  const handleCapturePhoto = () => {
    // Check if the device has camera support
    if (isCameraAvailable) {
      // Open the camera interface
      setShowCamera(true);
    } else {
      // Fallback to file input if camera is not available
      setCameraError("Camera not available on this device. Using file upload instead.");
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const timestamp = new Date().toISOString();
          const photoIndex = photos.length + 1;
          
          // Create location string for filename
          const locationString = location 
            ? `_${location.lat.toFixed(6)}_${location.lng.toFixed(6)}`
            : '';
          
          // CRITICAL: Use the exact assetId for the filename, plus location
          const filename = `${assetId}${locationString}_photo_${photoIndex}_${timestamp.replace(/[:.]/g, '-')}.jpg`;
          
          const newPhoto: AssetPhoto = {
            id: uuidv4(),
            assetId,
            data: event.target.result as string,
            filename,
            originalName: file.name,
            capturedAt: timestamp
          };
          
          setPhotos([...photos, newPhoto]);
          setCameraError(null);
        }
      };
      
      reader.readAsDataURL(file);
    }
    
    // Reset the input so the same file can be selected again
    if (e.target.value) {
      e.target.value = '';
    }
  };

  const handleCameraCapture = (imageData: string) => {
    const timestamp = new Date().toISOString();
    const photoIndex = photos.length + 1;
    
    // Create location string for filename
    const locationString = location 
      ? `_${location.lat.toFixed(6)}_${location.lng.toFixed(6)}`
      : '';
    
    // CRITICAL: Always use the exact assetId for the filename, plus location
    const photoFilename = `${assetId}${locationString}_photo_${photoIndex}_${timestamp.replace(/[:.]/g, '-')}.jpg`;
    
    const newPhoto: AssetPhoto = {
      id: uuidv4(),
      assetId,
      data: imageData,
      filename: photoFilename,
      capturedAt: timestamp
    };
    
    setPhotos([...photos, newPhoto]);
    setShowCamera(false);
    setCameraError(null);
  };

  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };
  
  const downloadPhoto = (photo: AssetPhoto) => {
    // Create a download link
    const link = document.createElement('a');
    link.href = photo.data;
    
    // CRITICAL: Use the exact filename that includes assetId and location
    link.download = photo.filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Determine asset type based on geometry
  let assetType = '';
  switch (geometry.type) {
    case 'Point':
      assetType = 'Marker';
      break;
    case 'LineString':
      assetType = 'Line';
      break;
    case 'Polygon':
      assetType = 'Polygon';
      break;
    default:
      assetType = 'Asset';
  }

  // Group properties into custom fields and additional properties
  const customFieldKeys = activeLayer?.customFields?.map(field => field.name) || [];
  const additionalProperties = Object.entries(properties).filter(([key]) => 
    !customFieldKeys.includes(key) && key !== 'latitude' && key !== 'longitude'
  );

  if (showCamera) {
    return <CameraCapture 
      onCapture={handleCameraCapture} 
      onClose={() => setShowCamera(false)} 
      assetId={assetId}
    />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {asset ? 'Edit' : 'New'} {assetType}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim() && validationErrors.name) {
                  const { name, ...rest } = validationErrors;
                  setValidationErrors(rest);
                }
              }}
              className={`w-full px-3 py-2 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
              placeholder="Enter name"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
          
          {/* Asset ID Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset ID
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={assetId}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This ID will be used in photo filenames for easy matching
            </p>
          </div>
          
          {/* Location Display */}
          {location && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="flex items-center bg-gray-100 p-2 rounded-md">
                <MapPin className="w-4 h-4 text-blue-600 mr-2" />
                <div className="text-sm">
                  <span className="font-medium">Lat:</span> {location.lat.toFixed(6)}, 
                  <span className="font-medium ml-2">Lng:</span> {location.lng.toFixed(6)}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Location coordinates will be included in photo filenames
              </p>
            </div>
          )}
          
          {/* Photos Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Photos
              </label>
              <div className="flex space-x-2">
                {isCameraAvailable !== false && (
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    <span>Take Photo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Image className="w-4 h-4 mr-1" />
                  <span>Upload</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            
            {cameraError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-600">{cameraError}</p>
                </div>
              </div>
            )}
            
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-md border border-gray-200">
                      <img 
                        src={photo.data} 
                        alt="Asset" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-1 right-1 flex space-x-1">
                      <button
                        type="button"
                        onClick={() => downloadPhoto(photo)}
                        className="bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download photo"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded">
                      Photo {photos.indexOf(photo) + 1}
                    </div>
                  </div>
                ))}
                <div 
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50"
                  onClick={handleCapturePhoto}
                >
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
                onClick={handleCapturePhoto}
              >
                <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Tap to take photos</p>
                <p className="text-xs text-gray-400 mt-1">
                  Photos will be named with this asset's ID and location coordinates
                </p>
              </div>
            )}
          </div>
          
          {/* Custom Fields Section */}
          {activeLayer?.customFields && activeLayer.customFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layer Fields
              </label>
              
              <div className="space-y-3 mb-4">
                {activeLayer.customFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm text-gray-700 mb-1">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={properties[field.name] || ''}
                        onChange={(e) => updateProperty(field.name, e.target.value)}
                        className={`w-full px-3 py-2 border ${validationErrors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={properties[field.name] || ''}
                        onChange={(e) => updateProperty(field.name, e.target.value)}
                        className={`w-full px-3 py-2 border ${validationErrors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}
                    
                    {field.type === 'date' && (
                      <input
                        type="date"
                        value={properties[field.name] || ''}
                        onChange={(e) => updateProperty(field.name, e.target.value)}
                        className={`w-full px-3 py-2 border ${validationErrors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
                      />
                    )}
                    
                    {field.type === 'boolean' && (
                      <select
                        value={properties[field.name] || ''}
                        onChange={(e) => updateProperty(field.name, e.target.value)}
                        className={`w-full px-3 py-2 border ${validationErrors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
                      >
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    )}
                    
                    {validationErrors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[field.name]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Location Properties */}
          {location && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Properties
              </label>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md">
                    <span className="font-medium">latitude:</span> {location.lat.toFixed(6)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md">
                    <span className="font-medium">longitude:</span> {location.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Additional Properties Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Properties
            </label>
            
            <div className="mb-2 space-y-2">
              {additionalProperties.map(([key, value]) => (
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
                onChange={(e) => {
                  setNewPropertyKey(e.target.value);
                  if (validationErrors.newProperty) {
                    const { newProperty, ...rest } = validationErrors;
                    setValidationErrors(rest);
                  }
                }}
                className={`flex-1 px-3 py-2 border ${validationErrors.newProperty ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black`}
                placeholder="Property name"
              />
              <input
                type="text"
                value={newPropertyValue}
                onChange={(e) => setNewPropertyValue(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
            {validationErrors.newProperty && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.newProperty}</p>
            )}
          </div>
          
          <div className="pt-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};