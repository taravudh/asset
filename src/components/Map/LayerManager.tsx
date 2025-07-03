import React, { useState, useEffect } from 'react';
import { X, Plus, Eye, EyeOff, Edit, Trash, Save, Download, Settings, Check, AlertCircle, MapPin, Map, Square } from 'lucide-react';
import { Layer } from '../../lib/types';
import { deleteLayer, updateLayer, createLayer } from '../../lib/database';

interface LayerManagerProps {
  projectId: string;
  userId: string;
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  onClose: () => void;
  onSelectActiveLayer: (layerId: string) => void;
  activeLayerId: string;
}

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  projectId,
  userId,
  layers,
  onLayersChange,
  onClose,
  onSelectActiveLayer,
  activeLayerId
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [exportFormat, setExportFormat] = useState<'GeoJSON' | 'CSV'>('GeoJSON');
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerType, setNewLayerType] = useState<'marker' | 'polyline' | 'polygon'>('marker');
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [customizingLayerId, setCustomizingLayerId] = useState<string | null>(null);
  const [layerColor, setLayerColor] = useState('#3388ff');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'boolean'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  
  // When customizing a layer, load its current settings
  useEffect(() => {
    if (customizingLayerId) {
      const layer = layers.find(l => l.id === customizingLayerId);
      if (layer) {
        setLayerColor(layer.style?.color || '#3388ff');
        setCustomFields(layer.customFields || []);
      }
    }
  }, [customizingLayerId, layers]);
  
  const handleToggleVisibility = async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    try {
      const updatedLayer = { ...layer, visible: !layer.visible };
      await updateLayer(layerId, { visible: !layer.visible });
      
      onLayersChange(
        layers.map(l => (l.id === layerId ? updatedLayer : l))
      );
    } catch (error) {
      console.error('Error toggling layer visibility:', error);
    }
  };
  
  const handleEditLayer = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditName(layer.name);
    setEditDescription(layer.description || '');
  };
  
  const handleSaveEdit = async () => {
    if (!editingLayerId || !editName.trim()) return;
    
    try {
      await updateLayer(editingLayerId, { 
        name: editName.trim(),
        description: editDescription.trim() || undefined
      });
      
      onLayersChange(
        layers.map(l => (l.id === editingLayerId ? { 
          ...l, 
          name: editName.trim(),
          description: editDescription.trim() || undefined
        } : l))
      );
      
      setEditingLayerId(null);
      setEditName('');
      setEditDescription('');
    } catch (error) {
      console.error('Error updating layer:', error);
    }
  };
  
  const handleDeleteLayer = async (layerId: string) => {
    if (!window.confirm('Are you sure you want to delete this layer? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteLayer(layerId);
      
      const updatedLayers = layers.filter(l => l.id !== layerId);
      onLayersChange(updatedLayers);
      
      // If the active layer was deleted, select another one
      if (activeLayerId === layerId && updatedLayers.length > 0) {
        onSelectActiveLayer(updatedLayers[0].id);
      }
    } catch (error) {
      console.error('Error deleting layer:', error);
    }
  };
  
  const handleExportLayer = (layer: Layer) => {
    if (exportFormat === 'GeoJSON') {
      // Export as GeoJSON
      const dataStr = JSON.stringify(layer.geojsonData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `${layer.name.replace(/\s+/g, '_')}.geojson`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (exportFormat === 'CSV') {
      // Export as CSV
      // This is a simple implementation - for complex geometries, you might want to use a library
      let csvContent = 'id,name,description,type,latitude,longitude\n';
      
      if (layer.geojsonData && layer.geojsonData.features) {
        layer.geojsonData.features.forEach((feature: any) => {
          const props = feature.properties || {};
          let lat = '';
          let lng = '';
          
          // Extract coordinates based on geometry type
          if (feature.geometry.type === 'Point') {
            lng = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
          } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon') {
            // For lines and polygons, use the first coordinate
            lng = feature.geometry.coordinates[0][0];
            lat = feature.geometry.coordinates[0][1];
          }
          
          csvContent += `${props.id || ''},${props.name || ''},${props.description || ''},${feature.geometry.type},${lat},${lng}\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${layer.name.replace(/\s+/g, '_')}.csv`);
      link.click();
    }
  };
  
  const handleSetActiveLayer = (layerId: string) => {
    onSelectActiveLayer(layerId);
  };

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) {
      setIsCreatingLayer(true);
      return;
    }
    
    try {
      // Generate a random color for the layer
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      
      // Create a new layer
      const newLayer = await createLayer({
        name: newLayerName.trim(),
        description: `Created on ${new Date().toLocaleString()}`,
        geojsonData: {
          type: 'FeatureCollection',
          features: []
        },
        projectId,
        userId,
        layerType: newLayerType, // Use the selected layer type
        style: {
          color: randomColor,
          fillColor: randomColor,
          weight: 3,
          opacity: 0.8,
          fillOpacity: 0.2
        },
        visible: true,
        customFields: []
      });
      
      // Add to local state
      onLayersChange([...layers, newLayer]);
      
      // Set as active layer
      onSelectActiveLayer(newLayer.id);
      
      // Reset form
      setNewLayerName('');
      setNewLayerType('marker');
      setIsCreatingLayer(false);
    } catch (error) {
      console.error('Error creating layer:', error);
      alert('Failed to create layer. Please try again.');
    }
  };

  const handleCustomizeLayer = (layerId: string) => {
    setCustomizingLayerId(layerId);
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setLayerColor(layer.style?.color || '#3388ff');
      setCustomFields(layer.customFields || []);
    }
  };

  const handleSaveCustomization = async () => {
    if (!customizingLayerId) return;
    
    try {
      const layer = layers.find(l => l.id === customizingLayerId);
      if (!layer) return;
      
      const updatedStyle = {
        ...layer.style,
        color: layerColor,
        fillColor: layerColor
      };
      
      await updateLayer(customizingLayerId, { 
        style: updatedStyle,
        customFields
      });
      
      onLayersChange(
        layers.map(l => (l.id === customizingLayerId ? { 
          ...l, 
          style: updatedStyle,
          customFields
        } : l))
      );
      
      setCustomizingLayerId(null);
    } catch (error) {
      console.error('Error updating layer customization:', error);
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      setFieldError('Field name is required');
      return;
    }
    
    // Check for duplicate field names
    if (customFields.some(field => field.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
      setFieldError('Field name must be unique');
      return;
    }
    
    setCustomFields([
      ...customFields,
      {
        name: newFieldName.trim(),
        type: newFieldType,
        required: newFieldRequired
      }
    ]);
    
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setFieldError(null);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="mr-2">Layer Manager</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {customizingLayerId ? (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Customize Layer</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Layer Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={layerColor}
                    onChange={(e) => setLayerColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300"
                  />
                  <span className="text-sm text-gray-600">{layerColor}</span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Data Fields
                  </label>
                </div>
                
                {customFields.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {customFields.map((field, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <div>
                          <span className="font-medium">{field.name}</span>
                          <div className="text-xs text-gray-500">
                            <span className="capitalize">{field.type}</span>
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomField(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic mb-3">
                    No custom fields defined
                  </div>
                )}
                
                <div className="space-y-2 border-t pt-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Add New Field</div>
                  
                  {fieldError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-2 rounded-md flex items-start">
                      <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      <span>{fieldError}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Field name"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Yes/No</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required-field"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="required-field" className="ml-2 block text-sm text-gray-700">
                      Required field
                    </label>
                  </div>
                  
                  <button
                    onClick={handleAddCustomField}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Field</span>
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleSaveCustomization}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={() => setCustomizingLayerId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {isCreatingLayer ? (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="text"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    placeholder="Enter layer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-black"
                    autoFocus
                  />
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Layer Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewLayerType('marker')}
                        className={`flex flex-col items-center justify-center p-2 rounded-md border ${
                          newLayerType === 'marker' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <MapPin className="w-5 h-5 mb-1" />
                        <span className="text-xs">Point</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewLayerType('polyline')}
                        className={`flex flex-col items-center justify-center p-2 rounded-md border ${
                          newLayerType === 'polyline' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Map className="w-5 h-5 mb-1" />
                        <span className="text-xs">Line</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewLayerType('polygon')}
                        className={`flex flex-col items-center justify-center p-2 rounded-md border ${
                          newLayerType === 'polygon' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Square className="w-5 h-5 mb-1" />
                        <span className="text-xs">Polygon</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateLayer}
                      disabled={!newLayerName.trim()}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingLayer(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingLayer(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 mb-4"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Layer</span>
                </button>
              )}
              
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Export Options</div>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'GeoJSON'}
                      onChange={() => setExportFormat('GeoJSON')}
                      className="mr-2"
                    />
                    <span>GeoJSON</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'CSV'}
                      onChange={() => setExportFormat('CSV')}
                      className="mr-2"
                    />
                    <span>CSV</span>
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {exportFormat === 'GeoJSON' 
                    ? 'Export complete layer with geometry as GeoJSON file'
                    : 'Export layer attributes as CSV file (limited geometry support)'}
                </div>
              </div>
              
              <div className="space-y-3">
                {layers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No layers available</p>
                    <p className="text-sm">Upload a GeoJSON file or create a new layer</p>
                  </div>
                ) : (
                  layers.map(layer => (
                    <div 
                      key={layer.id} 
                      className={`border rounded-lg p-3 ${
                        activeLayerId === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {editingLayerId === layer.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            autoFocus
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingLayerId(null)}
                              className="flex-1 py-1 px-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => handleSetActiveLayer(layer.id)}
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 rounded-full mr-2" 
                                style={{ backgroundColor: layer.style?.color || '#3388ff' }}
                              />
                              <span className="font-medium">{layer.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {layer.layerType === 'marker' && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Point Layer
                                </span>
                              )}
                              {layer.layerType === 'polyline' && (
                                <span className="flex items-center">
                                  <Map className="w-3 h-3 mr-1" />
                                  Line Layer
                                </span>
                              )}
                              {layer.layerType === 'polygon' && (
                                <span className="flex items-center">
                                  <Square className="w-3 h-3 mr-1" />
                                  Polygon Layer
                                </span>
                              )}
                              {!layer.layerType && 'Mixed Layer'}
                              {layer.customFields && layer.customFields.length > 0 && 
                                ` • ${layer.customFields.length} custom field${layer.customFields.length !== 1 ? 's' : ''}`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleToggleVisibility(layer.id)}
                              className={`p-1 rounded hover:bg-gray-100 ${
                                layer.visible ? 'text-blue-600' : 'text-gray-400'
                              }`}
                              title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                            >
                              {layer.visible ? (
                                <Eye className="w-5 h-5" />
                              ) : (
                                <EyeOff className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCustomizeLayer(layer.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600"
                              title="Customize Layer"
                            >
                              <Settings className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEditLayer(layer)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600"
                              title="Edit Layer"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleExportLayer(layer)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600"
                              title={`Export as ${exportFormat}`}
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLayer(layer.id)}
                              className="p-1 rounded hover:bg-gray-100 text-red-600"
                              title="Delete Layer"
                            >
                              <Trash className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {activeLayerId === layer.id && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Active Layer
                            </span>
                            {layer.visible ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">
                                Visible
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full ml-2">
                                Hidden
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};