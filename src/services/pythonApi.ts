import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const pythonApi = {
  /**
   * Check if the Python API is running
   */
  checkHealth: async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking Python API health:', error);
      throw error;
    }
  },

  /**
   * Create a buffer around a geometry
   * @param geometry GeoJSON geometry
   * @param distance Buffer distance in meters
   */
  bufferGeometry: async (geometry: GeoJSON.Geometry, distance: number) => {
    try {
      const response = await axios.post(`${API_URL}/buffer`, {
        geometry,
        distance
      });
      return response.data;
    } catch (error) {
      console.error('Error buffering geometry:', error);
      throw error;
    }
  },

  /**
   * Simplify a geometry
   * @param geometry GeoJSON geometry
   * @param tolerance Simplification tolerance
   */
  simplifyGeometry: async (geometry: GeoJSON.Geometry, tolerance: number = 0.0001) => {
    try {
      const response = await axios.post(`${API_URL}/simplify`, {
        geometry,
        tolerance
      });
      return response.data;
    } catch (error) {
      console.error('Error simplifying geometry:', error);
      throw error;
    }
  },

  /**
   * Find the intersection between two geometries
   * @param geometry1 First GeoJSON geometry
   * @param geometry2 Second GeoJSON geometry
   */
  findIntersection: async (geometry1: GeoJSON.Geometry, geometry2: GeoJSON.Geometry) => {
    try {
      const response = await axios.post(`${API_URL}/intersection`, {
        geometry1,
        geometry2
      });
      return response.data;
    } catch (error) {
      console.error('Error finding intersection:', error);
      throw error;
    }
  },

  /**
   * Analyze a GeoJSON file and return statistics
   * @param geojson GeoJSON FeatureCollection
   */
  analyzeGeoJSON: async (geojson: GeoJSON.FeatureCollection) => {
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        geojson
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing GeoJSON:', error);
      throw error;
    }
  },

  /**
   * Convert a file to GeoJSON or WKT
   * @param file File to convert
   * @param format Output format ('geojson' or 'wkt')
   */
  convertFormat: async (file: File, format: 'geojson' | 'wkt' = 'geojson') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      
      const response = await axios.post(`${API_URL}/convert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error converting file format:', error);
      throw error;
    }
  },

  /**
   * Create Voronoi polygons from points
   * @param points Array of [lon, lat] coordinates
   */
  createVoronoi: async (points: [number, number][]) => {
    try {
      const response = await axios.post(`${API_URL}/voronoi`, {
        points
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Voronoi diagram:', error);
      throw error;
    }
  }
};