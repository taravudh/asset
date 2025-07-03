import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, LogOut, Menu, X, User, Settings, Plus, Folder, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, Project, getProjectsByUser } from '../lib/database';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  // Fetch projects for current user
  useEffect(() => {
    const loadProjects = async () => {
      if (user) {
        try {
          setIsLoading(true);
          console.log('Loading projects for user:', user.id);
          const projects = await getProjectsByUser(user.id);
          console.log('Loaded projects:', projects);
          setUserProjects(projects);
        } catch (error) {
          console.error('Error loading projects:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadProjects();
  }, [user]);

  // Filter projects based on search query
  const filteredProjects = userProjects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectName.trim() || !user) {
      return;
    }
    
    try {
      setIsCreating(true);
      setCreateError(null);
      
      // Check if project name already exists
      const existingProject = await db.projects
        .where('name')
        .equals(newProjectName.trim())
        .and(project => project.userId === user.id && project.isActive)
        .first();
      
      if (existingProject) {
        setCreateError('A project with this name already exists');
        return;
      }
      
      // Create new project
      const now = new Date().toISOString();
      const newProject = {
        id: crypto.randomUUID(),
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
        isActive: true
      };
      
      await db.projects.add(newProject);
      
      // Add to local state
      setUserProjects([...userProjects, newProject]);
      
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProject(false);
      
      // Navigate to the new project
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Asset Survey</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>
              
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Admin
                </button>
              )}
              
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-800 font-medium">{user?.name || user?.email}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 py-3 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center space-x-2 px-4 py-2 w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center space-x-2 px-4 py-2 w-full bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Admin Dashboard</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">{user?.name || user?.email}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Projects</h2>
          <p className="text-gray-600">Select a project to continue or create a new one.</p>
        </div>
        
        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div 
                key={project.id} 
                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenProject(project.id)}
              >
                <div className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Folder className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                      {project.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{project.description}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                  <button
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
            {searchQuery ? (
              <div>
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No matching projects</h3>
                <p className="text-gray-600 mb-4">No projects match your search query "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div>
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Folder className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
                <p className="text-gray-600 mb-6">Create your first project to get started</p>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            Asset Survey Mapping Application &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      
      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Create New Project
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={handleCreateProject} className="space-y-4">
                        <div>
                          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
                            Project Name *
                          </label>
                          <input
                            type="text"
                            id="project-name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter project name"
                            required
                            autoFocus
                          />
                        </div>
                        
                        {createError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{createError}</p>
                          </div>
                        )}
                        
                        <div>
                          <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            id="project-description"
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter project description (optional)"
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProject(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                    setCreateError(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;