
// Fully Patched MapView.tsx
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
import { Layer, Asset } from '../../lib/types';
import { AssetFormModal } from './AssetFormModal';
import { createAsset, createLayer, deleteLayer, updateLayer, getLayersByProject } from '../../lib/database';
import { BasemapSelector } from './BasemapSelector';
import { MeasurementTool } from './MeasurementTool';
import { AttributeViewer } from './AttributeViewer';
import { AssetPanel } from './AssetPanel';
import { LayerManager } from './LayerManager';

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

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ZOOM = 6;

// Replace the MapContainer usage:
<MapContainer
  center={DEFAULT_CENTER as [number, number]}
  zoom={DEFAULT_ZOOM}
  style={{ height: '100%', width: '100%' }}
  zoomControl={false}
  whenCreated={(map: L.Map) => { mapRef.current = map; }}
>
  {basemap === 'OpenStreetMap' && (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      {...{ attribution: '© OpenStreetMap contributors' }}
    />
  )}
  {basemap === 'GoogleSatellite' && (
    <TileLayer
      url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
      {...{ attribution: '© Google Maps' }}
    />
  )}
  {basemap === 'GoogleHybrid' && (
    <TileLayer
      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      {...{ attribution: '© Google Maps' }}
    />
  )}
  {basemap === 'CartoDB' && (
    <TileLayer
      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
      {...{ attribution: '© CARTO' }}
    />
  )}
</MapContainer>

// Run this after patching:
// npm install --save-dev @types/leaflet @types/react-dom
