import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Layers, Upload, Download, Trash2, X, Map as MapIcon, Circle, Spline as Polyline, Square } from 'lucide-react';
import GeoJSONLayer from './GeoJSONLayer';
import GeoJSONUploader from './GeoJSONUploader';
import ToolbarButton from '../UI/ToolbarButton';
import { Layer, Asset } from '../lib/types';
import { AssetFormModal } from './AssetFormModal';
import { createAsset, createLayer, deleteLayer, updateLayer, getLayersByProject } from '../lib/database';
import { BasemapSelector } from './BasemapSelector';
import { MeasurementTool } from './MeasurementTool';
import { AttributeViewer } from './AttributeViewer';
import { AssetPanel } from './AssetPanel';
import { LayerManager } from './LayerManager';

// Fix Leaflet icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define map center for Thailand
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018]; // Bangkok
const DEFAULT_ZOOM = 6;

interface MapViewProps {
  projectId: string;
}

const MapView: React.FC<MapViewProps> = ({ projectId }) => {
  const [user] = useState({ id: 'user123' }); // Placeholder, replace with actual auth hook
  const [showUploader, setShowUploader] = useState(false);
  const [showBasemapSelector, setShowBasemapSelector] = useState(false);
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<Layer | null>(null);
  const [basemap, setBasemap] = useState('OpenStreetMap');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [newAssetGeometry, setNewAssetGeometry] = useState<any>(null);
  const [attributeViewer, setAttributeViewer] = useState<{
    asset: Asset;
    position: { x: number; y: number };
  } | null>(null);
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'none' | 'marker' | 'polyline' | 'polygon'>('none');
  
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Load layers for this project
  useEffect(() => {
    const loadLayers = async () => {
      try {
        // Get layers from database
        const projectLayers = await getLayersByProject(projectId);
        setLayers(projectLayers);
        
        // Set first layer as active if available
        if (projectLayers.length > 0 && !activeLayerId) {
          setActiveLayerId(projectLayers[0].id);
        }
      } catch (error) {
        console.error('Error loading layers:', error);
      }
    };
    
    loadLayers();
  }, [projectId, activeLayerId]);

  // Update active layer when activeLayerId changes
  useEffect(() => {
    if (activeLayerId) {
      const layer = layers.find(l => l.id === activeLayerId);
      setActiveLayer(layer || null);
    } else {
      setActiveLayer(null);
    }
  }, [activeLayerId, layers]);

  const handleGeoJSONUpload = async (geojson: any, fileName: string) => {
    try {
      // Generate a random color for the layer
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      
      // Create a new layer in the database
      const newLayer = await createLayer({
        name: fileName,
        description: `Uploaded on ${new Date().toLocaleString()}`,
        geojsonData: geojson,
        projectId,
        userId: user.id,
        layerType: 'marker', // Default type
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
      setLayers(prev => [...prev, newLayer]);
      
      // Set as active layer
      setActiveLayerId(newLayer.id);
      
      setShowUploader(false);
    } catch (error) {
      console.error('Error creating layer:', error);
      alert('Failed to create layer from GeoJSON. Please try again.');
    }
  };

  const handleClearLayers = () => {
    if (window.confirm('Are you sure you want to remove all layers? This cannot be undone.')) {
      // Delete all layers from database
      layers.forEach(async (layer) => {
        try {
          await deleteLayer(layer.id);
        } catch (error) {
          console.error(`Error deleting layer ${layer.id}:`, error);
        }
      });
      
      setLayers([]);
      setActiveLayerId('');
      setActiveLayer(null);
    }
  };

  const handleExportGeoJSON = () => {
    if (layers.length === 0) {
      alert('No layers to export');
      return;
    }
    
    // Combine all layers into a single FeatureCollection
    const features: any[] = [];
    
    layers.forEach(layer => {
      if (layer.geojsonData && layer.geojsonData.type === 'FeatureCollection') {
        features.push(...layer.geojsonData.features);
      } else if (layer.geojsonData && layer.geojsonData.type === 'Feature') {
        features.push(layer.geojsonData);
      }
    });
    
    const featureCollection = {
      type: 'FeatureCollection',
      features
    };
    
    // Create a download link
    const dataStr = JSON.stringify(featureCollection, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `export-${projectId}-${new Date().toISOString().slice(0, 10)}.geojson`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleLayersChange = (updatedLayers: Layer[]) => {
    setLayers(updatedLayers);
  };
  
  // Create a default layer if none exists
  const createDefaultLayer = async (layerType: 'marker' | 'polyline' | 'polygon'): Promise<string> => {
    try {
      // Generate a random color
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      
      // Create a new layer
      const newLayer = await createLayer({
        name: `${layerType.charAt(0).toUpperCase() + layerType.slice(1)} Layer`,
        description: `Default ${layerType} layer created on ${new Date().toLocaleString()}`,
        geojsonData: {
          type: 'FeatureCollection',
          features: []
        },
        projectId,
        userId: user.id,
        layerType,
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
      setLayers(prev => [...prev, newLayer]);
      
      // Set as active layer
      setActiveLayerId(newLayer.id);
      
      return newLayer.id;
    } catch (error) {
      console.error('Error creating default layer:', error);
      throw error;
    }
  };
  
  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    if (!newAssetGeometry || !activeLayerId) {
      alert('No active layer selected. Please create or select a layer first.');
      return;
    }
    
    try {
      // Determine asset type based on geometry
      let assetType: 'marker' | 'polyline' | 'polygon';
      switch (newAssetGeometry.type) {
        case 'Point':
          assetType = 'marker';
          break;
        case 'LineString':
          assetType = 'polyline';
          break;
        case 'Polygon':
          assetType = 'polygon';
          break;
        default:
          assetType = 'marker'; // Default fallback
      }
      
      // Apply the active layer's style to the asset
      const style = activeLayer?.style ? { ...activeLayer.style } : undefined;
      
      // Create the asset in the database
      const newAsset = await createAsset({
        id: assetData.id, // CRITICAL: Use the provided ID to ensure consistency
        name: assetData.name || 'Unnamed Asset',
        description: assetData.description,
        assetType,
        geometry: newAssetGeometry,
        properties: assetData.properties || {},
        projectId,
        userId: user.id,
        layerId: activeLayerId,
        style,
        photos: assetData.photos || []
      });
      
      // Update the layer's GeoJSON data to include this new asset
      if (activeLayer) {
        // Ensure geojsonData is initialized properly
        const currentFeatures = activeLayer.geojsonData && activeLayer.geojsonData.features 
          ? activeLayer.geojsonData.features 
          : [];
        
        const updatedFeatures = [
          ...currentFeatures,
          {
            type: 'Feature',
            properties: {
              ...assetData.properties,
              name: assetData.name,
              description: assetData.description,
              assetId: newAsset.id // CRITICAL: Use the consistent asset ID
            },
            geometry: newAssetGeometry
          }
        ];
        
        const updatedGeoJSON = {
          type: 'FeatureCollection',
          features: updatedFeatures
        };
        
        // Update the layer in the database
        await updateLayer(activeLayerId, { 
          geojsonData: updatedGeoJSON,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
        setLayers(prev => prev.map(layer => 
          layer.id === activeLayerId 
            ? { ...layer, geojsonData: updatedGeoJSON } 
            : layer
        ));
      }
      
      // Reset state
      setShowAssetForm(false);
      setNewAssetGeometry(null);
      setDrawingMode('none');
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
    }
  };
  
  const handleUpdateAsset = async (assetId: string, updates: Partial<Asset>) => {
    // Implement asset update logic
    console.log('Update asset:', assetId, updates);
    setSelectedAsset(null);
  };
  
  const handleDeleteAsset = async (assetId: string) => {
    // Implement asset delete logic
    console.log('Delete asset:', assetId);
    setSelectedAsset(null);
  };

  const toggleDrawingMode = (mode: 'marker' | 'polyline' | 'polygon') => {
    if (drawingMode === mode) {
      setDrawingMode('none');
    } else {
      setDrawingMode(mode);
      
      // If no active layer, create one
      if (!activeLayerId) {
        createDefaultLayer(mode);
      }
      
      // Clear any existing drawn items
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    }
  };

  // Handle created shapes from the draw control
  const handleCreated = (e: any) => {
    const { layerType, layer } = e;
    
    // Check if we have an active layer
    if (!activeLayerId) {
      // Create a default layer based on the type of geometry drawn
      let layerTypeForDefault: 'marker' | 'polyline' | 'polygon';
      
      switch (layerType) {
        case 'marker':
          layerTypeForDefault = 'marker';
          break;
        case 'polyline':
          layerTypeForDefault = 'polyline';
          break;
        case 'polygon':
        case 'rectangle':
          layerTypeForDefault = 'polygon';
          break;
        default:
          layerTypeForDefault = 'marker';
      }
      
      createDefaultLayer(layerTypeForDefault).then(() => {
        processDrawnLayer(layerType, layer);
      });
      return;
    }
    
    processDrawnLayer(layerType, layer);
  };
  
  const processDrawnLayer = (layerType: string, layer: L.Layer) => {
    let geometry: any = null;
    
    // Convert the drawn layer to GeoJSON geometry
    if (layerType === 'marker') {
      const marker = layer as L.Marker;
      const latlng = marker.getLatLng();
      geometry = {
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      };
    } else if (layerType === 'polyline') {
      const polyline = layer as L.Polyline;
      const latlngs = polyline.getLatLngs() as L.LatLng[];
      geometry = {
        type: 'LineString',
        coordinates: latlngs.map(latlng => [latlng.lng, latlng.lat])
      };
    } else if (layerType === 'polygon' || layerType === 'rectangle') {
      const polygon = layer as L.Polygon;
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
      geometry = {
        type: 'Polygon',
        coordinates: [latlngs.map(latlng => [latlng.lng, latlng.lat])]
      };
    } else if (layerType === 'circle') {
      const circle = layer as L.Circle;
      const center = circle.getLatLng();
      const radius = circle.getRadius();
      
      // For circles, we'll create a polygon approximation
      const points = 32; // Number of points to approximate the circle
      const coordinates = [];
      
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const lat = center.lat + (radius / 111319) * Math.sin(angle);
        const lng = center.lng + (radius / (111319 * Math.cos(center.lat * Math.PI / 180))) * Math.cos(angle);
        coordinates.push([lng, lat]);
      }
      
      // Close the polygon
      coordinates.push(coordinates[0]);
      
      geometry = {
        type: 'Polygon',
        coordinates: [coordinates]
      };
    }
    
    if (geometry) {
      // Clear the drawn layer from the map
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
      
      // Set the geometry for the asset form
      setNewAssetGeometry(geometry);
      setShowAssetForm(true);
    }
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        whenCreated={(map: L.Map) => { mapRef.current = map; }}
      >
        {/* Base map layer */}
        {basemap === 'OpenStreetMap' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}
        {basemap === 'GoogleSatellite' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
          />
        )}
        {basemap === 'GoogleHybrid' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
          />
        )}
        {basemap === 'CartoDB' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        )}
        
        <ZoomControl position="bottomright" />
        
        {/* Drawing tools */}
        <FeatureGroup ref={(ref) => { featureGroupRef.current = ref as L.FeatureGroup | null; }}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: drawingMode === 'marker',
              polyline: drawingMode === 'polyline',
              polygon: drawingMode === 'polygon'
            }}
            edit={{
              edit: false,
              remove: false
            }}
          />
        </FeatureGroup>
        
        {/* Render layers */}
        {layers.filter(layer => layer.visible).map(layer => (
          <GeoJSONLayer
            key={layer.id}
            layerId={layer.id}
            data={layer.geojsonData}
            color={layer.style?.color}
            opacity={layer.style?.opacity}
            weight={layer.style?.weight}
            fillOpacity={layer.style?.fillOpacity}
          />
        ))}
      </MapContainer>
      
      {/* Drawing toolbar */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md p-2 flex flex-col space-y-2">
        <ToolbarButton
          icon={MapIcon}
          active={showBasemapSelector}
          onClick={() => {
            setShowBasemapSelector(!showBasemapSelector);
            setShowUploader(false);
            setShowMeasurementTool(false);
          }}
          title="Change Basemap"
        />
        <ToolbarButton
          icon={Circle}
          active={drawingMode === 'marker'}
          onClick={() => toggleDrawingMode('marker')}
          title="Add Marker"
        />
        <ToolbarButton
          icon={Polyline}
          active={drawingMode === 'polyline'}
          onClick={() => toggleDrawingMode('polyline')}
          title="Draw Line"
        />
        <ToolbarButton
          icon={Square}
          active={drawingMode === 'polygon'}
          onClick={() => toggleDrawingMode('polygon')}
          title="Draw Polygon"
        />
        <ToolbarButton
          icon={Upload}
          active={showUploader}
          onClick={() => {
            setShowUploader(!showUploader);
            setShowBasemapSelector(false);
            setShowMeasurementTool(false);
          }}
          title="Upload GeoJSON"
        />
        <ToolbarButton
          icon={Download}
          onClick={handleExportGeoJSON}
          disabled={layers.length === 0}
          title="Export GeoJSON"
        />
        <ToolbarButton
          icon={Trash2}
          onClick={handleClearLayers}
          disabled={layers.length === 0}
          title="Clear Layers"
        />
      </div>
      
      {/* GeoJSON Uploader */}
      {showUploader && (
        <div className="absolute top-4 left-16 z-[1000] bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Upload GeoJSON</h3>
            <button
              onClick={() => setShowUploader(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <GeoJSONUploader 
            onUpload={handleGeoJSONUpload}
            multiple={true}
          />
        </div>
      )}
      
      {/* Basemap Selector */}
      {showBasemapSelector && (
        <BasemapSelector
          currentBasemap={basemap}
          onSelectBasemap={setBasemap}
          onClose={() => setShowBasemapSelector(false)}
        />
      )}
      
      {/* Measurement Tool */}
      {showMeasurementTool && (
        <MeasurementTool />
      )}
      
      {/* Layer Manager Button */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={() => setShowLayerManager(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Layer Manager"
        >
          <Layers className="w-6 h-6" />
        </button>
      </div>
      
      {/* Layer Manager Modal */}
      {showLayerManager && (
        <LayerManager
          projectId={projectId}
          userId={user.id}
          layers={layers}
          onLayersChange={handleLayersChange}
          onClose={() => setShowLayerManager(false)}
          onSelectActiveLayer={setActiveLayerId}
          activeLayerId={activeLayerId}
        />
      )}
      
      {/* Asset Form Modal */}
      {showAssetForm && newAssetGeometry && activeLayerId && (
        <AssetFormModal
          geometry={newAssetGeometry}
          onSave={handleSaveAsset}
          onCancel={() => {
            setShowAssetForm(false);
            setNewAssetGeometry(null);
          }}
          projectId={projectId}
          layerId={activeLayerId}
          activeLayer={activeLayer}
        />
      )}
      
      {/* Attribute Viewer */}
      {attributeViewer && (
        <AttributeViewer
          asset={attributeViewer.asset}
          position={attributeViewer.position}
          onClose={() => setAttributeViewer(null)}
          onViewDetails={() => {
            setSelectedAsset(attributeViewer.asset);
            setAttributeViewer(null);
          }}
        />
      )}
      
      {/* Asset Panel */}
      {selectedAsset && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000]">
          <AssetPanel
            asset={selectedAsset}
            onUpdate={handleUpdateAsset}
            onDelete={handleDeleteAsset}
            onClose={() => setSelectedAsset(null)}
          />
        </div>
      )}
    </div>
  );
};

export default MapView;

export { MapView };