import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, Project, Asset, Layer, AssetPhoto } from './types';

// Define the database
export class AssetSurveyDB extends Dexie {
  users: Dexie.Table<User, string>;
  projects: Dexie.Table<Project, string>;
  assets: Dexie.Table<Asset, string>;
  layers: Dexie.Table<Layer, string>;
  photos: Dexie.Table<AssetPhoto, string>;

  constructor() {
    super('AssetSurveyDB');
    
    // Define tables and indexes - updated version to 333 to include location in photos
    this.version(333).stores({
      users: 'id, email, role, createdAt',
      projects: 'id, name, userId, createdAt, isActive',
      assets: 'id, name, projectId, userId, layerId, createdAt',
      layers: 'id, name, projectId, userId, createdAt',
      photos: 'id, assetId, filename, capturedAt'
    });
    
    // Define types
    this.users = this.table('users');
    this.projects = this.table('projects');
    this.assets = this.table('assets');
    this.layers = this.table('layers');
    this.photos = this.table('photos');
  }
}

// Create database instance
export const db = new AssetSurveyDB();

// Initialize the database with default admin user
export async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminCount = await db.users.where({ role: 'admin' }).count();
    
    if (adminCount === 0) {
      // Create default admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      await db.users.add({
        id: uuidv4(),
        email: 'admin@example.com',
        password: adminPassword,
        name: 'System Administrator',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
      
      console.log('Created default admin user: admin@example.com / admin123');
    }
    
    // Create a default user account for easier testing
    const userCount = await db.users.where({ email: 'user@example.com' }).count();
    
    if (userCount === 0) {
      const userPassword = await bcrypt.hash('user123', 10);
      
      await db.users.add({
        id: uuidv4(),
        email: 'user@example.com',
        password: userPassword,
        name: 'Test User',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
      
      console.log('Created default user: user@example.com / user123');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User management functions
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'role'> & { role?: 'admin' | 'user' }) {
  try {
    // Check if user already exists
    const existingUser = await db.users.where({ email: userData.email }).first();
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create new user
    const newUser: User = {
      id: uuidv4(),
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: new Date().toISOString()
    };
    
    // Add to database
    await db.users.add(newUser);
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const users = await db.users.toArray();
    // Return users without passwords
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>) {
  try {
    const updatedData: any = { ...updates };
    
    // If password is being updated, hash it
    if (updates.password) {
      updatedData.password = await bcrypt.hash(updates.password, 10);
    }
    
    await db.users.update(userId, updatedData);
    
    const updatedUser = await db.users.get(userId);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(userId: string) {
  try {
    await db.users.delete(userId);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function authenticateUser(email: string, password: string) {
  try {
    // Find user by email
    const user = await db.users.where({ email }).first();
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Check if user password exists and is valid
    if (!user.password || typeof user.password !== 'string') {
      throw new Error('User data is corrupted or missing password information');
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }
    
    // Update last login time
    await db.users.update(user.id, {
      lastLoginAt: new Date().toISOString()
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}

// Project management functions
export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) {
  try {
    const now = new Date().toISOString();
    
    const newProject: Project = {
      id: uuidv4(),
      name: projectData.name,
      description: projectData.description,
      userId: projectData.userId,
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    
    await db.projects.add(newProject);
    return newProject;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function checkIfProjectNameExistsInDb(name: string, userId: string, excludeId?: string) {
  try {
    // Query for projects with the same name and same user
    const projects = await db.projects
      .where('name')
      .equals(name)
      .filter(project => 
        project.userId === userId && 
        project.isActive === true && 
        (excludeId ? project.id !== excludeId : true)
      )
      .toArray();
    
    return projects.length > 0;
  } catch (error) {
    console.error('Error checking if project name exists:', error);
    throw error;
  }
}

export async function getProjectsByUser(userId: string) {
  try {
    console.log('Fetching projects for user:', userId);
    const projects = await db.projects
      .where('userId')
      .equals(userId)
      .and(project => project.isActive === true)
      .toArray();
    
    console.log('Found projects:', projects.length);
    return projects;
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
}

export async function updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  try {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.projects.update(projectId, updatedData);
    
    return await db.projects.get(projectId);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteProject(projectId: string) {
  try {
    // Soft delete - set isActive to false
    await db.projects.update(projectId, {
      isActive: false,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// Asset management functions
export async function createAsset(assetData: Omit<Asset, 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    
    const newAsset: Asset = {
      id: assetData.id || uuidv4(), // Use provided ID or generate new one
      name: assetData.name,
      description: assetData.description,
      assetType: assetData.assetType,
      geometry: assetData.geometry,
      properties: assetData.properties || {},
      projectId: assetData.projectId,
      userId: assetData.userId,
      layerId: assetData.layerId,
      style: assetData.style,
      createdAt: now,
      updatedAt: now,
      photos: assetData.photos || []
    };
    
    await db.assets.add(newAsset);
    
    // If there are photos, store them in the photos table as well
    if (newAsset.photos && newAsset.photos.length > 0) {
      for (const photo of newAsset.photos) {
        await db.photos.add({
          ...photo,
          assetId: newAsset.id
        });
      }
    }
    
    return newAsset;
  } catch (error) {
    console.error('Error creating asset:', error);
    throw error;
  }
}

export async function getAssetsByProject(projectId: string) {
  try {
    return await db.assets
      .where({ projectId })
      .toArray();
  } catch (error) {
    console.error('Error getting assets:', error);
    throw error;
  }
}

export async function getAssetsByLayer(layerId: string) {
  try {
    return await db.assets
      .where({ layerId })
      .toArray();
  } catch (error) {
    console.error('Error getting assets by layer:', error);
    throw error;
  }
}

export async function updateAsset(assetId: string, updates: Partial<Omit<Asset, 'id' | 'createdAt'>>) {
  try {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.assets.update(assetId, updatedData);
    
    // If photos are being updated, update the photos table as well
    if (updates.photos) {
      // First, delete all existing photos for this asset
      await db.photos.where({ assetId }).delete();
      
      // Then add the new photos
      for (const photo of updates.photos) {
        await db.photos.add({
          ...photo,
          assetId
        });
      }
    }
    
    return await db.assets.get(assetId);
  } catch (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
}

export async function deleteAsset(assetId: string) {
  try {
    // Delete all photos associated with this asset
    await db.photos.where({ assetId }).delete();
    
    // Delete the asset
    await db.assets.delete(assetId);
    return true;
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

// Photo management functions
export async function addPhotoToAsset(assetId: string, photoData: string, filename?: string, location?: {lat: number, lng: number}) {
  try {
    const now = new Date().toISOString();
    
    // Generate a unique filename if not provided
    // CRITICAL: Use the exact assetId in the filename
    const photoIndex = (await db.photos.where({ assetId }).count()) + 1;
    
    // Include location in filename if available
    const locationString = location 
      ? `_${location.lat.toFixed(6)}_${location.lng.toFixed(6)}`
      : '';
    
    const photoFilename = filename || `${assetId}${locationString}_photo_${photoIndex}_${now.replace(/[:.]/g, '-')}.jpg`;
    
    const newPhoto: AssetPhoto = {
      id: uuidv4(),
      assetId,
      data: photoData,
      filename: photoFilename,
      capturedAt: now
    };
    
    // Add to database
    await db.photos.add(newPhoto);
    
    // Get the asset
    const asset = await db.assets.get(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Update the asset with the new photo
    const photos = asset.photos || [];
    photos.push(newPhoto);
    
    await db.assets.update(assetId, { 
      photos,
      updatedAt: now
    });
    
    return newPhoto;
  } catch (error) {
    console.error('Error adding photo to asset:', error);
    throw error;
  }
}

export async function getAssetPhotos(assetId: string) {
  try {
    return await db.photos
      .where({ assetId })
      .toArray();
  } catch (error) {
    console.error('Error getting asset photos:', error);
    throw error;
  }
}

export async function deletePhoto(photoId: string) {
  try {
    // Get the photo to find its assetId
    const photo = await db.photos.get(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    // Delete the photo
    await db.photos.delete(photoId);
    
    // Update the asset's photos array
    const asset = await db.assets.get(photo.assetId);
    if (asset && asset.photos) {
      const updatedPhotos = asset.photos.filter(p => p.id !== photoId);
      await db.assets.update(photo.assetId, { 
        photos: updatedPhotos,
        updatedAt: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

// Layer management functions
export async function createLayer(layerData: Omit<Layer, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    
    const newLayer: Layer = {
      id: uuidv4(),
      name: layerData.name,
      description: layerData.description,
      geojsonData: layerData.geojsonData,
      projectId: layerData.projectId,
      userId: layerData.userId,
      layerType: layerData.layerType,
      style: layerData.style,
      visible: layerData.visible !== undefined ? layerData.visible : true,
      createdAt: now,
      updatedAt: now,
      customFields: layerData.customFields || []
    };
    
    await db.layers.add(newLayer);
    return newLayer;
  } catch (error) {
    console.error('Error creating layer:', error);
    throw error;
  }
}

export async function getLayersByProject(projectId: string) {
  try {
    return await db.layers
      .where({ projectId })
      .toArray();
  } catch (error) {
    console.error('Error getting layers:', error);
    throw error;
  }
}

export async function updateLayer(layerId: string, updates: Partial<Omit<Layer, 'id' | 'createdAt'>>) {
  try {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.layers.update(layerId, updatedData);
    
    return await db.layers.get(layerId);
  } catch (error) {
    console.error('Error updating layer:', error);
    throw error;
  }
}

export async function deleteLayer(layerId: string) {
  try {
    // Delete all assets in this layer first
    await db.assets.where({ layerId }).delete();
    
    // Then delete the layer
    await db.layers.delete(layerId);
    
    return true;
  } catch (error) {
    console.error('Error deleting layer:', error);
    throw error;
  }
}