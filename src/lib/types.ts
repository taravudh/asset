// Define common types used throughout the application

// User type
export interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt?: string;
}

// Project type
export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

// Custom field definition for layers
export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

// Photo type for asset photos
export interface AssetPhoto {
  id: string;
  assetId: string;
  data: string; // Base64 encoded image data
  filename: string;
  originalName?: string;
  capturedAt: string;
}

// Asset type
export interface Asset {
  id: string;
  name: string;
  description?: string;
  assetType: 'marker' | 'polyline' | 'polygon';
  geometry: GeoJSON.Geometry;
  properties?: Record<string, any>;
  projectId: string;
  userId: string;
  layerId?: string;
  createdAt: string;
  updatedAt?: string;
  style?: {
    color?: string;
    weight?: number;
    opacity?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
  photos?: AssetPhoto[]; // Photos associated with this asset
}

// Layer type
export interface Layer {
  id: string;
  name: string;
  description?: string;
  geojsonData: any; // GeoJSON data
  projectId: string;
  userId: string;
  layerType?: 'marker' | 'polyline' | 'polygon';
  style?: {
    color?: string;
    weight?: number;
    opacity?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
  visible?: boolean;
  createdAt: string;
  updatedAt?: string;
  customFields?: CustomField[]; // Custom fields for this layer
}

// Drawing mode type
export type DrawingMode = 'none' | 'marker' | 'polyline' | 'polygon';