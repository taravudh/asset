# GIS Mapping Application with Python Integration

This application combines a React-based web mapping interface with Python geospatial libraries for advanced analysis.

## Features

- Interactive map with drawing tools (points, lines, polygons)
- Layer management system
- GeoJSON import/export
- Measurement tools
- Python-powered geospatial analysis:
  - Buffer creation
  - Geometry simplification
  - Voronoi diagram generation
  - GeoJSON analysis
  - Format conversion

## Technology Stack

### Frontend
- React with TypeScript
- Leaflet for mapping
- Tailwind CSS for styling
- Dexie.js for client-side storage

### Backend
- Python Flask API
- GeoPandas for geospatial operations
- Shapely for geometry manipulation
- NumPy and SciPy for numerical operations

## Getting Started

### Prerequisites
- Node.js (v16+)
- Python 3.8+ with pip

### Installation

1. Clone the repository
2. Install JavaScript dependencies:
   ```
   npm install
   ```
3. Install Python dependencies:
   ```
   pip install -r api/requirements.txt
   ```

### Running the Application

1. Start the React frontend:
   ```
   npm run dev
   ```

2. In a separate terminal, start the Python API:
   ```
   npm run start-api
   ```

3. Open your browser to http://localhost:5173

## Python API Endpoints

The Python API provides several geospatial operations:

- `/api/health` - Check if the API is running
- `/api/buffer` - Create a buffer around a geometry
- `/api/simplify` - Simplify a geometry
- `/api/intersection` - Find the intersection between two geometries
- `/api/analyze` - Analyze a GeoJSON file and return statistics
- `/api/convert` - Convert between different geospatial formats
- `/api/voronoi` - Create Voronoi polygons from points

## Project Structure

```
├── api/                  # Python API
│   ├── app.py            # Flask application
│   └── requirements.txt  # Python dependencies
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── Map/          # Map-related components
│   │   └── UI/           # UI components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and database
│   ├── pages/            # Page components
│   └── services/         # API services
└── package.json          # Project configuration
```

## License

This project is licensed under the MIT License.