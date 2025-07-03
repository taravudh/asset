import React, { useState, useEffect } from 'react';
import { X, Hexagon, Scissors, Layers, Activity, FileUp, Zap } from 'lucide-react';
import { pythonApi } from '../../services/pythonApi';
import toast from 'react-hot-toast';

interface PythonToolsProps {
  onClose: () => void;
  onAddLayer: (geojson: any, name: string) => void;
  activeGeometry?: GeoJSON.Geometry | null;
  projectId: string;
}

export function PythonTools({ onClose, onAddLayer, activeGeometry, projectId }: PythonToolsProps) {
  const [activeTab, setActiveTab] = useState<'buffer' | 'simplify' | 'voronoi' | 'analyze'>('buffer');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Buffer tool state
  const [bufferDistance, setBufferDistance] = useState(100);
  
  // Simplify tool state
  const [simplifyTolerance, setSimplifyTolerance] = useState(0.0001);
  
  // Voronoi tool state
  const [voronoiPoints, setVoronoiPoints] = useState<[number, number][]>([]);
  const [newPointLat, setNewPointLat] = useState('');
  const [newPointLng, setNewPointLng] = useState('');
  
  // Analyze tool state
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Check if Python API is running
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        await pythonApi.checkHealth();
        setApiStatus('online');
      } catch (error) {
        console.error('Python API is not available:', error);
        setApiStatus('offline');
      }
    };
    
    checkApiStatus();
  }, []);

  const handleBufferGeometry = async () => {
    if (!activeGeometry) {
      toast.error('No geometry selected. Please select or draw a geometry first.');
      return;
    }
    
    try {
      setIsProcessing(true);
      const result = await pythonApi.bufferGeometry(activeGeometry, bufferDistance);
      
      if (result.status === 'success') {
        // Add the buffer as a new layer
        onAddLayer(result.buffer, `Buffer (${bufferDistance}m)`);
        toast.success('Buffer created successfully');
      } else {
        toast.error('Failed to create buffer');
      }
    } catch (error) {
      console.error('Error creating buffer:', error);
      toast.error('Error creating buffer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimplifyGeometry = async () => {
    if (!activeGeometry) {
      toast.error('No geometry selected. Please select or draw a geometry first.');
      return;
    }
    
    try {
      setIsProcessing(true);
      const result = await pythonApi.simplifyGeometry(activeGeometry, simplifyTolerance);
      
      if (result.status === 'success') {
        // Add the simplified geometry as a new layer
        onAddLayer(result.simplified, `Simplified (${simplifyTolerance})`);
        toast.success('Geometry simplified successfully');
      } else {
        toast.error('Failed to simplify geometry');
      }
    } catch (error) {
      console.error('Error simplifying geometry:', error);
      toast.error('Error simplifying geometry');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddVoronoiPoint = () => {
    if (!newPointLat || !newPointLng) return;
    
    const lat = parseFloat(newPointLat);
    const lng = parseFloat(newPointLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }
    
    setVoronoiPoints([...voronoiPoints, [lng, lat]]);
    setNewPointLat('');
    setNewPointLng('');
  };

  const handleCreateVoronoi = async () => {
    if (voronoiPoints.length < 3) {
      toast.error('At least 3 points are required for Voronoi diagram');
      return;
    }
    
    try {
      setIsProcessing(true);
      const result = await pythonApi.createVoronoi(voronoiPoints);
      
      if (result.status === 'success') {
        // Add the Voronoi diagram as a new layer
        onAddLayer(result.voronoi, `Voronoi Diagram (${voronoiPoints.length} points)`);
        toast.success('Voronoi diagram created successfully');
      } else {
        toast.error('Failed to create Voronoi diagram');
      }
    } catch (error) {
      console.error('Error creating Voronoi diagram:', error);
      toast.error('Error creating Voronoi diagram');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeGeoJSON = async () => {
    if (!analyzeFile) {
      toast.error('Please select a GeoJSON file to analyze');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const geojson = JSON.parse(e.target?.result as string);
          const result = await pythonApi.analyzeGeoJSON(geojson);
          
          if (result.status === 'success') {
            setAnalysisResults(result.statistics);
            toast.success('Analysis complete');
          } else {
            toast.error('Failed to analyze GeoJSON');
          }
        } catch (error) {
          console.error('Error parsing or analyzing GeoJSON:', error);
          toast.error('Error parsing or analyzing GeoJSON');
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsText(analyzeFile);
    } catch (error) {
      console.error('Error analyzing GeoJSON:', error);
      toast.error('Error analyzing GeoJSON');
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAnalyzeFile(e.target.files[0]);
      setAnalysisResults(null);
    }
  };

  return (
    <div className="absolute top-4 left-16 z-[1000] bg-white rounded-lg shadow-lg w-80">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-gray-700 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-purple-600" />
          Python Geospatial Tools
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {apiStatus === 'checking' && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking Python API status...</p>
        </div>
      )}
      
      {apiStatus === 'offline' && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
            <p className="text-red-600 font-medium">Python API is not running</p>
            <p className="text-sm text-red-500 mt-1">
              Start the Python API with:
            </p>
            <div className="mt-2 bg-gray-800 text-white p-2 rounded text-sm font-mono overflow-x-auto">
              npm run start-api
            </div>
            <button
              onClick={() => {
                setApiStatus('checking');
                pythonApi.checkHealth()
                  .then(() => setApiStatus('online'))
                  .catch(() => setApiStatus('offline'));
              }}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
      
      {apiStatus === 'online' && (
        <>
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium ${
                activeTab === 'buffer' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('buffer')}
            >
              Buffer
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium ${
                activeTab === 'simplify' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('simplify')}
            >
              Simplify
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium ${
                activeTab === 'voronoi' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('voronoi')}
            >
              Voronoi
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium ${
                activeTab === 'analyze' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('analyze')}
            >
              Analyze
            </button>
          </div>
          
          <div className="p-4">
            {activeTab === 'buffer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buffer Distance (meters)
                  </label>
                  <input
                    type="number"
                    value={bufferDistance}
                    onChange={(e) => setBufferDistance(Number(e.target.value))}
                    min="1"
                    max="10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  {activeGeometry ? (
                    <p>Selected geometry: {activeGeometry.type}</p>
                  ) : (
                    <p className="italic">No geometry selected. Please select or draw a geometry first.</p>
                  )}
                </div>
                
                <button
                  onClick={handleBufferGeometry}
                  disabled={!activeGeometry || isProcessing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Hexagon className="w-4 h-4" />
                      <span>Create Buffer</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {activeTab === 'simplify' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simplification Tolerance
                  </label>
                  <input
                    type="number"
                    value={simplifyTolerance}
                    onChange={(e) => setSimplifyTolerance(Number(e.target.value))}
                    min="0.00001"
                    max="0.01"
                    step="0.00001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values result in more simplification. Recommended range: 0.00001 - 0.001
                  </p>
                </div>
                
                <div className="text-sm text-gray-600">
                  {activeGeometry ? (
                    <p>Selected geometry: {activeGeometry.type}</p>
                  ) : (
                    <p className="italic">No geometry selected. Please select or draw a geometry first.</p>
                  )}
                </div>
                
                <button
                  onClick={handleSimplifyGeometry}
                  disabled={!activeGeometry || isProcessing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      <span>Simplify Geometry</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {activeTab === 'voronoi' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Points ({voronoiPoints.length})
                    </label>
                    {voronoiPoints.length > 0 && (
                      <button
                        onClick={() => setVoronoiPoints([])}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto mb-2 border border-gray-200 rounded-md">
                    {voronoiPoints.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 italic">
                        No points added yet
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {voronoiPoints.map((point, index) => (
                          <div key={index} className="p-2 text-sm flex justify-between items-center">
                            <span>
                              Point {index + 1}: [{point[1].toFixed(6)}, {point[0].toFixed(6)}]
                            </span>
                            <button
                              onClick={() => {
                                const newPoints = [...voronoiPoints];
                                newPoints.splice(index, 1);
                                setVoronoiPoints(newPoints);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={newPointLat}
                        onChange={(e) => setNewPointLat(e.target.value)}
                        placeholder="e.g. 13.7563"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={newPointLng}
                        onChange={(e) => setNewPointLng(e.target.value)}
                        placeholder="e.g. 100.5018"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddVoronoiPoint}
                    disabled={!newPointLat || !newPointLng}
                    className="w-full text-sm flex items-center justify-center space-x-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Point</span>
                  </button>
                </div>
                
                <button
                  onClick={handleCreateVoronoi}
                  disabled={voronoiPoints.length < 3 || isProcessing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Hexagon className="w-4 h-4" />
                      <span>Create Voronoi Diagram</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {activeTab === 'analyze' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload GeoJSON File
                  </label>
                  <input
                    type="file"
                    accept=".json,.geojson"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
                
                <button
                  onClick={handleAnalyzeGeoJSON}
                  disabled={!analyzeFile || isProcessing}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      <span>Analyze GeoJSON</span>
                    </>
                  )}
                </button>
                
                {analysisResults && (
                  <div className="mt-4 border border-gray-200 rounded-md p-3 bg-gray-50">
                    <h4 className="font-medium text-gray-700 mb-2">Analysis Results</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Features:</span> {analysisResults.feature_count}
                      </div>
                      
                      <div>
                        <span className="font-medium">Geometry Types:</span>
                        <ul className="list-disc list-inside ml-2">
                          {Object.entries(analysisResults.geometry_types).map(([type, count]) => (
                            <li key={type}>{type}: {count}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {analysisResults.total_area_m2 !== undefined && (
                        <div>
                          <span className="font-medium">Area:</span>
                          <ul className="list-disc list-inside ml-2">
                            <li>Total: {(analysisResults.total_area_m2 / 1000000).toFixed(2)} km²</li>
                            <li>Average: {(analysisResults.mean_area_m2 / 1000000).toFixed(2)} km²</li>
                          </ul>
                        </div>
                      )}
                      
                      {analysisResults.total_length_m !== undefined && (
                        <div>
                          <span className="font-medium">Length:</span>
                          <ul className="list-disc list-inside ml-2">
                            <li>Total: {(analysisResults.total_length_m / 1000).toFixed(2)} km</li>
                            <li>Average: {(analysisResults.mean_length_m / 1000).toFixed(2)} km</li>
                          </ul>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium">Bounds:</span>
                        <div className="text-xs font-mono bg-gray-100 p-1 rounded mt-1">
                          [{analysisResults.bounds.map((b: number) => b.toFixed(6)).join(', ')}]
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}