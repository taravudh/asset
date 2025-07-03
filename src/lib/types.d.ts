// Define GeoJSON namespace if it doesn't exist
declare namespace GeoJSON {
  interface Geometry {
    type: string;
    coordinates: any;
  }
}

// Declare modules for libraries without type definitions
declare module 'react-konva';
declare module 'konva';
declare module 'react-hot-toast';