import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Download, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoData: string, filename: string) => void;
  onClose: () => void;
  assetId?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  assetId = 'unknown'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up function to stop the camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start the camera with error handling
  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop any existing stream first
      stopCamera();
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      // Store the stream reference for cleanup
      streamRef.current = stream;
      
      // Only set video source if component is still mounted and videoRef exists
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Use event listener instead of promise to handle play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setIsCameraActive(true);
                setIsLoading(false);
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError(`Camera error: ${err.message || 'Could not start video'}`);
                setIsLoading(false);
                stopCamera();
              });
          }
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Camera access denied: ${err instanceof Error ? err.message : 'Please check your camera permissions'}`);
      setIsLoading(false);
    }
  };

  // Capture a photo from the video stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL (base64 image)
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        
        // Stop the camera after capturing
        stopCamera();
      }
    }
  };

  // Generate a filename for the captured photo
  const generateFilename = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const photoIndex = 1; // This could be incremented if multiple photos are taken
    return `${assetId}_photo_${photoIndex}_${timestamp}.jpg`;
  };

  // Save the captured photo
  const savePhoto = () => {
    if (capturedImage) {
      const filename = generateFilename();
      onCapture(capturedImage, filename);
      onClose();
    }
  };

  // Discard the captured photo and restart the camera
  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Download the captured photo directly
  const downloadPhoto = () => {
    if (capturedImage) {
      const filename = generateFilename();
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Start the camera when the component mounts
  useEffect(() => {
    startCamera();
    
    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Camera className="w-5 h-5 mr-2 text-blue-600" />
            {capturedImage ? 'Review Photo' : 'Take Photo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <p className="font-medium mb-1">Error:</p>
              <p>{error}</p>
              <button 
                onClick={startCamera}
                className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 flex items-center text-sm"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Try Again
              </button>
            </div>
          )}
          
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                  style={{ display: isCameraActive ? 'block' : 'none' }}
                />
                
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Accessing camera...</p>
                    </div>
                  </div>
                )}
                
                {!isCameraActive && !isLoading && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Camera initializing...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-64 object-contain"
              />
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="mt-4 flex justify-between">
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive || isLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture Photo
              </button>
            ) : (
              <div className="flex w-full space-x-2">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake
                </button>
                
                <button
                  onClick={downloadPhoto}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                
                <button
                  onClick={savePhoto}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </button>
              </div>
            )}
          </div>
          
          <p className="mt-3 text-xs text-gray-500">
            Photos will be associated with asset ID: {assetId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;