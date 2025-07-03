/*
  # Multi-Organization Schema

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text, unique organization name)
      - `slug` (text, unique URL-friendly identifier)
      - `description` (text, optional)
      - `settings` (jsonb, organization-specific settings)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_active` (boolean, for soft delete)

    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (text, user role in organization)
      - `permissions` (jsonb, specific permissions)
      - `invited_by` (uuid, who invited this user)
      - `joined_at` (timestamp)
      - `is_active` (boolean)

    - `organization_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `email` (text, invited email)
      - `role` (text, intended role)
      - `invited_by` (uuid, who sent invitation)
      - `token` (text, invitation token)
      - `expires_at` (timestamp)
      - `accepted_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Updates to Existing Tables
    - Add `organization_id` to `projects`, `assets`, `layers`
    - Update RLS policies for organization-based access

  3. Security
    - Enable RLS on all tables
    - Add policies for organization-based data access
    - Ensure users can only access their organization's data

  4. Functions
    - Function to get user's organizations
    - Function to check user permissions
    - Function to handle organization invitations
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  permissions jsonb DEFAULT '{}',
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(organization_id, user_id)
);

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add organization_id to existing tables
DO $$
BEGIN
  -- Add to projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to assets table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to layers table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE layers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_layers_organization_id ON layers(organization_id);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they admin" ON organizations;
DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;

-- Create RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create RLS policies for organization_members
CREATE POLICY "Users can view memberships in their organizations"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can manage memberships"
  ON organization_members FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );

CREATE POLICY "Users can update their own membership"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create RLS policies for organization_invitations
CREATE POLICY "Users can view invitations for their organizations"
  ON organization_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Organization admins can manage invitations"
  ON organization_invitations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );

-- Update RLS policies for existing tables to include organization filtering
DROP POLICY IF EXISTS "Enable all operations for all users" ON projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON assets;
DROP POLICY IF EXISTS "Enable insert for all users" ON assets;
DROP POLICY IF EXISTS "Enable update for all users" ON assets;
DROP POLICY IF EXISTS "Enable delete for all users" ON assets;
DROP POLICY IF EXISTS "Enable read access for all users" ON layers;
DROP POLICY IF EXISTS "Enable insert for all users" ON layers;
DROP POLICY IF EXISTS "Enable update for all users" ON layers;
DROP POLICY IF EXISTS "Enable delete for all users" ON layers;

-- Projects policies
CREATE POLICY "Users can view projects in their organizations"
  ON projects FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create projects in their organizations"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update projects in their organizations"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete projects in their organizations"
  ON projects FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Assets policies
CREATE POLICY "Users can view assets in their organizations"
  ON assets FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create assets in their organizations"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update assets in their organizations"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete assets in their organizations"
  ON assets FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Layers policies
CREATE POLICY "Users can view layers in their organizations"
  ON layers FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create layers in their organizations"
  ON layers FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update layers in their organizations"
  ON layers FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete layers in their organizations"
  ON layers FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create functions for organization management
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role text,
  joined_at timestamptz
) 
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    om.joined_at
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = user_uuid 
    AND om.is_active = true 
    AND o.is_active = true
  ORDER BY om.joined_at DESC;
$$;

CREATE OR REPLACE FUNCTION check_user_organization_permission(
  user_uuid uuid,
  org_id uuid,
  required_role text DEFAULT 'member'
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND is_active = true
      AND CASE 
        WHEN required_role = 'owner' THEN role = 'owner'
        WHEN required_role = 'admin' THEN role IN ('owner', 'admin')
        ELSE role IN ('owner', 'admin', 'member')
      END
  );
$$;

CREATE OR REPLACE FUNCTION accept_organization_invitation(invitation_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  invitation_record organization_invitations%ROWTYPE;
  user_email text;
  result json;
BEGIN
  -- Get current user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Get invitation
  SELECT * INTO invitation_record 
  FROM organization_invitations 
  WHERE token = invitation_token 
    AND email = user_email
    AND expires_at > now()
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (invitation_record.organization_id, auth.uid(), invitation_record.role, invitation_record.invited_by)
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET 
    role = invitation_record.role,
    is_active = true,
    joined_at = now();
  
  -- Mark invitation as accepted
  UPDATE organization_invitations 
  SET accepted_at = now() 
  WHERE id = invitation_record.id;
  
  RETURN json_build_object('success', true, 'organization_id', invitation_record.organization_id);
END;
$$;

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;