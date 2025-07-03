// Define GeoJSON namespace if it doesn't exist
declare namespace GeoJSON {
  interface Geometry {
    type: string;
    coordinates: any;
  }
  
  interface Feature {
    type: "Feature";
    geometry: Geometry;
    properties: any;
  }
  
  interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
}

// Declare modules for libraries without type definitions
declare module 'react-konva';
declare module 'konva';
declare module 'react-hot-toast';

// Fix for leaflet attribution issue
declare module 'react-leaflet' {
  export interface TileLayerProps {
    attribution?: string;
    url: string;
  }
  
  export interface MapContainerProps {
    center?: [number, number];
    zoom?: number;
    whenCreated?: (map: L.Map) => void;
  }
}

// Declare missing types for uuid
declare module 'uuid' {
  export function v4(): string;
}

// Declare missing types for bcryptjs
declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}