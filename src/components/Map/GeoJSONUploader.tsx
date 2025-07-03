import React, { useState, useRef } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';

interface GeoJSONUploaderProps {
  onUpload: (geojson: any, fileName: string) => void;
  multiple?: boolean;
}

const GeoJSONUploader: React.FC<GeoJSONUploaderProps> = ({ 
  onUpload,
  multiple = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateGeoJSON = (data: any): boolean => {
    // Basic validation
    if (!data) return false;
    
    // Check if it's a GeoJSON object
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      return true;
    }
    
    // Check if it's a single Feature
    if (data.type === 'Feature' && data.geometry) {
      return true;
    }
    
    // Check if it's a Geometry object
    if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(data.type)) {
      return true;
    }
    
    return false;
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const text = await file.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON file. Please upload a valid GeoJSON file.');
      }
      
      if (!validateGeoJSON(data)) {
        throw new Error('Invalid GeoJSON format. Please upload a valid GeoJSON file.');
      }
      
      // If it's not a FeatureCollection, convert it
      if (data.type !== 'FeatureCollection') {
        if (data.type === 'Feature') {
          data = {
            type: 'FeatureCollection',
            features: [data]
          };
        } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(data.type)) {
          data = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: data,
              properties: {}
            }]
          };
        }
      }
      
      // Ensure all features have properties
      if (data.features) {
        data.features = data.features.map((feature: any) => {
          if (!feature.properties) {
            feature.properties = {};
          }
          return feature;
        });
      }
      
      onUpload(data, file.name);
      setLoading(false);
    } catch (error) {
      console.error('Error processing GeoJSON file:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      
      if (multiple) {
        // Process multiple files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
            await processFile(file);
          } else {
            setError('Please upload only GeoJSON files (.json or .geojson)');
          }
        }
      } else {
        // Process single file
        const file = files[0];
        if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
          await processFile(file);
        } else {
          setError('Please upload a GeoJSON file (.json or .geojson)');
        }
      }
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      
      if (multiple) {
        // Process multiple files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
            await processFile(file);
          } else {
            setError('Please upload only GeoJSON files (.json or .geojson)');
          }
        }
      } else {
        // Process single file
        const file = files[0];
        if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
          await processFile(file);
        } else {
          setError('Please upload a GeoJSON file (.json or .geojson)');
        }
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.geojson"
          onChange={handleChange}
          multiple={multiple}
          className="hidden"
        />
        
        <File className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        
        <p className="text-sm text-gray-600 mb-2">
          Drag & drop your GeoJSON file here
        </p>
        
        <button
          type="button"
          onClick={handleButtonClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Browse Files
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-2">
          Supported formats: .geojson, .json
        </p>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoJSONUploader;