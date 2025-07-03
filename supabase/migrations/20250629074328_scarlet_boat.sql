/*
  # Create projects table for project management

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, unique project name)
      - `description` (text, optional description)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_active` (boolean, for soft delete/archive)

  2. Security
    - Enable RLS on `projects` table
    - Add policy for public access (since no authentication system)

  3. Changes
    - Add project_id foreign key to assets table
    - Add project_id foreign key to layers table
    - Create indexes for performance
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Enable all operations for all users"
  ON projects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add project_id to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add project_id to layers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layers' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE layers ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_layers_project_id ON layers(project_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;