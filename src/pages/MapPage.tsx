import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Menu, X } from 'lucide-react';
import { Header } from '../components/Header';
import { MapView } from '../components/Map/MapView';
import { useAuth } from '../hooks/useAuth';
import { db, Project, createProject, updateProject, deleteProject, checkIfProjectNameExistsInDb, getProjectsByUser } from '../lib/database';
import { useLiveQuery } from 'dexie-react-hooks';

const MapPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  
  // Load project and user's projects
  useEffect(() => {
    const loadData = async () => {
      if (!user || !projectId) return;
      
      try {
        setIsLoading(true);
        
        // Load the current project
        const projectData = await db.projects.get(projectId);
        
        // Check if project exists and belongs to user
        if (!projectData || projectData.userId !== user.id) {
          navigate('/dashboard');
          return;
        }
        
        setProject(projectData);
        
        // Load all user projects
        const projects = await getProjectsByUser(user.id);
        setUserProjects(projects);
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [projectId, user, navigate]);
  
  const handleProjectSelect = (project: Project) => {
    navigate(`/project/${project.id}`);
    setIsSidebarOpen(false);
  };
  
  const handleProjectCreate = async (data: { name: string; description?: string }) => {
    if (!user) return Promise.reject(new Error('User not authenticated'));
    
    const newProject = await createProject({
      name: data.name,
      description: data.description,
      userId: user.id
    });
    
    // Add to local state
    setUserProjects([...userProjects, newProject]);
    
    navigate(`/project/${newProject.id}`);
    return newProject;
  };
  
  const handleProjectUpdate = async (id: string, updates: Partial<Project>) => {
    const updatedProject = await updateProject(id, updates);
    
    // Update local state
    setUserProjects(userProjects.map(p => p.id === id ? updatedProject : p));
    
    if (project && project.id === id) {
      setProject(updatedProject);
    }
    
    return updatedProject;
  };
  
  const handleProjectDelete = async (id: string) => {
    await deleteProject(id);
    
    // Update local state
    setUserProjects(userProjects.filter(p => p.id !== id));
    
    if (id === projectId) {
      navigate('/dashboard');
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search functionality
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Wrapper function to automatically pass user ID
  const checkProjectNameExists = async (name: string, excludeId?: string) => {
    if (!user) return false;
    return await checkIfProjectNameExistsInDb(name, user.id, excludeId);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        onSearch={handleSearch}
        projects={userProjects}
        currentProject={project}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        onProjectUpdate={handleProjectUpdate}
        onProjectDelete={handleProjectDelete}
        user={user}
        onLogout={handleLogout}
        checkIfProjectNameExistsInDb={checkProjectNameExists}
      />
      
      {project && projectId ? (
        <MapView projectId={projectId} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Project Selected</h2>
            <p className="text-gray-600 mb-6">
              Please select an existing project or create a new one to start mapping assets.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;