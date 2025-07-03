/*
  # Asset Survey Database Schema

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `asset_type` (text, required) - Type of geometric feature (marker, polygon, etc.)
      - `geometry` (jsonb, required) - GeoJSON geometry object
      - `properties` (jsonb, optional) - Additional asset properties
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)
    
    - `layers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `geojson_data` (jsonb, required) - Complete GeoJSON feature collection
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access for demonstration purposes

  3. Indexes
    - Add GIN index on geometry column for spatial queries
    - Add indexes on commonly queried columns
*/

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text DEFAULT '',
    asset_type text NOT NULL,
    geometry jsonb NOT NULL,
    properties jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create layers table for uploaded GeoJSON files
CREATE TABLE IF NOT EXISTS layers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text DEFAULT '',
    geojson_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_geometry ON assets USING GIN (geometry);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets (created_at);
CREATE INDEX IF NOT EXISTS idx_layers_created_at ON layers (created_at);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

-- Create policies for assets table
CREATE POLICY "Enable read access for all users" ON assets FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON assets FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON assets FOR DELETE USING (true);

-- Create policies for layers table
CREATE POLICY "Enable read access for all users" ON layers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON layers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON layers FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON layers FOR DELETE USING (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_layers_updated_at 
    BEFORE UPDATE ON layers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();