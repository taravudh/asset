import React, { useState } from 'react'
import { FolderOpen, Plus, Edit2, Trash2, Save, Folder, Search, Map } from 'lucide-react'
import { Project } from '../lib/types'

interface ProjectSelectionScreenProps {
  user: {
    id: string
    email: string
    name?: string
  }
  projects: Project[]
  onProjectSelect: (project: Project) => void
  onProjectCreate: (data: { name: string; description?: string }) => Promise<Project>
  onProjectUpdate: (id: string, updates: Partial<Project>) => Promise<Project>
  onProjectDelete: (id: string) => Promise<void>
  onLogout: () => void
  onOpenAdmin?: () => void
  onSetupSuperAdmin?: () => void
  isAdmin?: boolean
  isSuperAdmin?: boolean
  checkIfProjectNameExistsInDb?: (name: string, excludeId?: string) => Promise<boolean>
}

export function ProjectSelectionScreen({
  user,
  projects,
  onProjectSelect,
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  onLogout,
  onOpenAdmin,
  onSetupSuperAdmin,
  isAdmin = false,
  isSuperAdmin = false,
  checkIfProjectNameExistsInDb
}: ProjectSelectionScreenProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createProjectError, setCreateProjectError] = useState<string | null>(null)
  const [updateProjectError, setUpdateProjectError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const trimmedName = newProjectName.trim()

    try {
      setIsCreating(true)
      setCreateProjectError(null)

      // Client-side validation for duplicate names (now async)
      if (checkIfProjectNameExistsInDb) {
        const nameTaken = await checkIfProjectNameExistsInDb(trimmedName)
        if (nameTaken) {
          setCreateProjectError('A project with this name already exists. Please choose a different name.')
          setIsCreating(false)
          return
        }
      }
      
      await onProjectCreate({
        name: trimmedName,
        description: newProjectDescription.trim()
      })
      
      setNewProjectName('')
      setNewProjectDescription('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      setCreateProjectError(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !newProjectName.trim()) return

    const trimmedName = newProjectName.trim()

    try {
      setUpdateProjectError(null)

      // Client-side validation for duplicate names (excluding current project, now async)
      if (checkIfProjectNameExistsInDb) {
        const nameTaken = await checkIfProjectNameExistsInDb(trimmedName, editingProject.id)
        if (nameTaken) {
          setUpdateProjectError('A project with this name already exists. Please choose a different name.')
          return
        }
      }
      
      await onProjectUpdate(editingProject.id, {
        name: trimmedName,
        description: newProjectDescription.trim()
      })
      
      setEditingProject(null)
      setNewProjectName('')
      setNewProjectDescription('')
    } catch (error) {
      console.error('Failed to update project:', error)
      setUpdateProjectError(error instanceof Error ? error.message : 'Failed to update project')
    }
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will also delete all associated assets.`)) {
      return
    }

    try {
      await onProjectDelete(project.id)
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert(`Error deleting project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditing = (project: Project) => {
    setEditingProject(project)
    setNewProjectName(project.name)
    setNewProjectDescription(project.description || '')
    setUpdateProjectError(null)
  }

  const cancelEditing = () => {
    setEditingProject(null)
    setNewProjectName('')
    setNewProjectDescription('')
    setUpdateProjectError(null)
  }

  const cancelCreate = () => {
    setShowCreateForm(false)
    setNewProjectName('')
    setNewProjectDescription('')
    setCreateProjectError(null)
  }

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Map className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Asset Survey</h1>
            </div>
            <div className="flex items-center space-x-4">
              {(isAdmin || isSuperAdmin) && (
                <button
                  onClick={onOpenAdmin}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Admin Dashboard
                </button>
              )}
              {!isSuperAdmin && onSetupSuperAdmin && (
                <button
                  onClick={onSetupSuperAdmin}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Setup Admin
                </button>
              )}
              <button
                onClick={onLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {user.name || user.email.split('@')[0]}</h2>
          <p className="mt-1 text-gray-600">Select an existing project or create a new one to get started.</p>
        </div>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="relative">
                {editingProject?.id === project.id ? (
                  <form onSubmit={handleUpdateProject} className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-blue-400">
                    <div className="p-6 space-y-4">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Project name"
                        required
                        autoFocus
                      />
                      {updateProjectError && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                          {updateProjectError}
                        </p>
                      )}
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description (optional)"
                        rows={3}
                      />
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all">
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => onProjectSelect(project)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Folder className="w-6 h-6 text-blue-600" />
                          <h3 className="ml-2 text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(project);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            title="Edit project"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project);
                            }}
                            className="p-1 hover:bg-red-100 rounded-full transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center text-blue-600 font-medium">
                          <FolderOpen className="w-4 h-4 mr-1" />
                          <span>Open Project</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {searchQuery ? (
              <div>
                <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching projects found</h3>
                <p className="text-gray-600 mb-4">Try a different search term or create a new project.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowCreateForm(true);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Project</span>
                </button>
              </div>
            ) : (
              <div>
                <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started with asset mapping.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Project</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateProject}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Create New Project
                      </h3>
                      <div className="mt-4 space-y-4">
                        {createProjectError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{createProjectError}</p>
                          </div>
                        )}
                        
                        <div>
                          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
                            Project Name *
                          </label>
                          <input
                            type="text"
                            id="project-name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter project name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
                            Description (Optional)
                          </label>
                          <textarea
                            id="project-description"
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter project description"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || isCreating}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}