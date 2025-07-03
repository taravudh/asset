from flask import Flask, request, jsonify
from flask_cors import CORS
import geopandas as gpd
from shapely.geometry import shape, Point, LineString, Polygon
import numpy as np
import os
import json
import tempfile
from pyproj import CRS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "Python geospatial API is running"
    })

@app.route('/api/buffer', methods=['POST'])
def buffer_geometry():
    """Create a buffer around a geometry"""
    try:
        data = request.json
        geojson = data.get('geometry')
        distance = data.get('distance', 100)  # Default 100 meters
        
        # Convert GeoJSON to shapely geometry
        geometry = shape(geojson)
        
        # Create a GeoDataFrame with the geometry
        gdf = gpd.GeoDataFrame(geometry=[geometry], crs="EPSG:4326")
        
        # Convert to a projected CRS for accurate buffering (meters)
        # UTM zone depends on the location, this is approximate
        gdf_projected = gdf.to_crs(epsg=3857)  # Web Mercator
        
        # Create buffer
        gdf_buffer = gdf_projected.buffer(distance)
        
        # Convert back to WGS84
        gdf_buffer_wgs84 = gpd.GeoDataFrame(geometry=gdf_buffer, crs=3857).to_crs(4326)
        
        # Convert to GeoJSON
        buffer_geojson = json.loads(gdf_buffer_wgs84.to_json())
        
        return jsonify({
            "status": "success",
            "buffer": buffer_geojson
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/simplify', methods=['POST'])
def simplify_geometry():
    """Simplify a geometry"""
    try:
        data = request.json
        geojson = data.get('geometry')
        tolerance = data.get('tolerance', 0.0001)  # Default tolerance
        
        # Convert GeoJSON to shapely geometry
        geometry = shape(geojson)
        
        # Simplify the geometry
        simplified = geometry.simplify(tolerance)
        
        # Convert back to GeoJSON
        simplified_geojson = gpd.GeoSeries([simplified]).__geo_interface__
        
        return jsonify({
            "status": "success",
            "simplified": simplified_geojson
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/intersection', methods=['POST'])
def find_intersection():
    """Find the intersection between two geometries"""
    try:
        data = request.json
        geojson1 = data.get('geometry1')
        geojson2 = data.get('geometry2')
        
        # Convert GeoJSON to shapely geometries
        geometry1 = shape(geojson1)
        geometry2 = shape(geojson2)
        
        # Find intersection
        if geometry1.intersects(geometry2):
            intersection = geometry1.intersection(geometry2)
            intersection_geojson = gpd.GeoSeries([intersection]).__geo_interface__
            
            return jsonify({
                "status": "success",
                "intersects": True,
                "intersection": intersection_geojson
            })
        else:
            return jsonify({
                "status": "success",
                "intersects": False,
                "intersection": None
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/analyze', methods=['POST'])
def analyze_geojson():
    """Analyze a GeoJSON file and return statistics"""
    try:
        data = request.json
        geojson = data.get('geojson')
        
        # Create a GeoDataFrame from the GeoJSON
        gdf = gpd.GeoDataFrame.from_features(geojson["features"])
        
        # Calculate basic statistics
        stats = {
            "feature_count": len(gdf),
            "geometry_types": gdf.geometry.type.value_counts().to_dict(),
            "properties": list(gdf.columns[:-1]),  # All columns except geometry
            "bounds": gdf.total_bounds.tolist()  # [minx, miny, maxx, maxy]
        }
        
        # Calculate area if polygons exist
        if 'Polygon' in stats["geometry_types"] or 'MultiPolygon' in stats["geometry_types"]:
            # Project to a suitable CRS for area calculation
            gdf_projected = gdf.to_crs(epsg=3857)  # Web Mercator
            # Calculate area in square meters
            areas = gdf_projected[gdf_projected.geometry.type.isin(['Polygon', 'MultiPolygon'])].geometry.area
            stats["total_area_m2"] = float(areas.sum())
            stats["mean_area_m2"] = float(areas.mean())
            stats["min_area_m2"] = float(areas.min())
            stats["max_area_m2"] = float(areas.max())
        
        # Calculate length if lines exist
        if 'LineString' in stats["geometry_types"] or 'MultiLineString' in stats["geometry_types"]:
            # Project to a suitable CRS for length calculation
            gdf_projected = gdf.to_crs(epsg=3857)  # Web Mercator
            # Calculate length in meters
            lengths = gdf_projected[gdf_projected.geometry.type.isin(['LineString', 'MultiLineString'])].geometry.length
            stats["total_length_m"] = float(lengths.sum())
            stats["mean_length_m"] = float(lengths.mean())
            stats["min_length_m"] = float(lengths.min())
            stats["max_length_m"] = float(lengths.max())
        
        return jsonify({
            "status": "success",
            "statistics": stats
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/convert', methods=['POST'])
def convert_format():
    """Convert between different geospatial formats"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                "status": "error",
                "message": "No file provided"
            }), 400
            
        file = request.files['file']
        output_format = request.form.get('format', 'geojson')
        
        # Create a temporary file to save the uploaded file
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, file.filename)
        file.save(temp_file_path)
        
        # Read the file with geopandas
        gdf = gpd.read_file(temp_file_path)
        
        # Convert to the requested format
        if output_format == 'geojson':
            result = json.loads(gdf.to_json())
            return jsonify({
                "status": "success",
                "data": result
            })
        elif output_format == 'wkt':
            result = gdf.geometry.to_wkt().tolist()
            return jsonify({
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Unsupported output format: {output_format}"
            }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route('/api/voronoi', methods=['POST'])
def create_voronoi():
    """Create Voronoi polygons from points"""
    try:
        data = request.json
        points = data.get('points')  # List of [lon, lat] coordinates
        
        # Convert points to a GeoDataFrame
        geometries = [Point(p[0], p[1]) for p in points]
        gdf = gpd.GeoDataFrame(geometry=geometries, crs="EPSG:4326")
        
        # Project to a suitable CRS for Voronoi diagram
        gdf_projected = gdf.to_crs(epsg=3857)
        
        # Create Voronoi diagram
        from scipy.spatial import Voronoi
        coords = np.array([[geom.x, geom.y] for geom in gdf_projected.geometry])
        vor = Voronoi(coords)
        
        # Convert Voronoi regions to polygons
        from shapely.geometry import Polygon as ShapelyPolygon
        
        # Create a boundary that's 20% larger than the points extent
        x_min, y_min, x_max, y_max = gdf_projected.total_bounds
        dx, dy = x_max - x_min, y_max - y_min
        boundary = ShapelyPolygon([
            (x_min - 0.2 * dx, y_min - 0.2 * dy),
            (x_max + 0.2 * dx, y_min - 0.2 * dy),
            (x_max + 0.2 * dx, y_max + 0.2 * dy),
            (x_min - 0.2 * dx, y_max + 0.2 * dy)
        ])
        
        # Create Voronoi polygons
        voronoi_polygons = []
        for i, region_idx in enumerate(vor.point_region):
            region = vor.regions[region_idx]
            if -1 not in region and len(region) > 0:
                polygon = ShapelyPolygon([vor.vertices[i] for i in region])
                # Clip to boundary
                polygon = polygon.intersection(boundary)
                voronoi_polygons.append(polygon)
        
        # Create GeoDataFrame with Voronoi polygons
        voronoi_gdf = gpd.GeoDataFrame(geometry=voronoi_polygons, crs=3857)
        
        # Convert back to WGS84
        voronoi_gdf = voronoi_gdf.to_crs(4326)
        
        # Convert to GeoJSON
        voronoi_geojson = json.loads(voronoi_gdf.to_json())
        
        return jsonify({
            "status": "success",
            "voronoi": voronoi_geojson
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)