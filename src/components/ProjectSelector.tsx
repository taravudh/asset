import React, { useState, useEffect } from 'react'
import { ChevronDown, Plus, FolderOpen, Edit2, Trash2, X, Save, Folder } from 'lucide-react'
import { Project } from '../lib/types'

interface ProjectSelectorProps {
  projects: Project[]
  currentProject: Project | null
  onProjectSelect: (project: Project) => void
  onProjectCreate: (data: { name: string; description?: string }) => Promise<Project>
  onProjectUpdate: (id: string, updates: Partial<Project>) => Promise<Project>
  onProjectDelete: (id: string) => Promise<void>
  loading?: boolean
  checkIfProjectNameExistsInDb?: (name: string, excludeId?: string) => Promise<boolean>
}

export function ProjectSelector({
  projects,
  currentProject,
  onProjectSelect,
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  loading = false,
  checkIfProjectNameExistsInDb
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createProjectError, setCreateProjectError] = useState<string | null>(null)
  const [updateProjectError, setUpdateProjectError] = useState<string | null>(null)

  // Check if project name already exists (async version)
  const isProjectNameTaken = async (name: string, excludeId?: string): Promise<boolean> => {
    if (checkIfProjectNameExistsInDb) {
      return await checkIfProjectNameExistsInDb(name, excludeId)
    }
    // Fallback to local check if database check is not available
    return projects.some(project => 
      project.name.toLowerCase() === name.toLowerCase() && 
      project.id !== excludeId
    )
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const trimmedName = newProjectName.trim()

    try {
      setIsCreating(true)
      setCreateProjectError(null)

      // Client-side validation for duplicate names (now async)
      const nameTaken = await isProjectNameTaken(trimmedName)
      if (nameTaken) {
        setCreateProjectError('A project with this name already exists. Please choose a different name.')
        setIsCreating(false)
        return
      }
      
      await onProjectCreate({
        name: trimmedName,
        description: newProjectDescription.trim()
      })
      
      setNewProjectName('')
      setNewProjectDescription('')
      setShowCreateForm(false)
      setIsOpen(false)
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
      const nameTaken = await isProjectNameTaken(trimmedName, editingProject.id)
      if (nameTaken) {
        setUpdateProjectError('A project with this name already exists. Please choose a different name.')
        return
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

  return (
    <div className="relative">
      {/* Project Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px] text-left"
        disabled={loading}
      >
        <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentProject ? currentProject.name : 'Select Project'}
          </div>
          {currentProject && (
            <div className="text-xs text-gray-500 truncate">
              {projects.length} project{projects.length !== 1 ? 's' : ''} available
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Mobile: Full screen overlay */}
          <div className="fixed inset-0 z-[2000] bg-white sm:hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Select Project</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Create New Project Button */}
                <div className="p-4 border-b">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center space-x-3 p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-700">Create New Project</span>
                  </button>
                </div>

                {/* Projects List */}
                <div className="p-4 space-y-2">
                  {projects.map((project) => (
                    <div key={project.id} className="relative">
                      {editingProject?.id === project.id ? (
                        <form onSubmit={handleUpdateProject} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                          <div className="space-y-3">
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
                              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                                {updateProjectError}
                              </p>
                            )}
                            <textarea
                              value={newProjectDescription}
                              onChange={(e) => setNewProjectDescription(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Description (optional)"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                type="submit"
                                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <div
                          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            currentProject?.id === project.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            onProjectSelect(project)
                            setIsOpen(false)
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Created {new Date(project.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditing(project)
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Edit project"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProject(project)
                                }}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {projects.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No projects yet</p>
                      <p className="text-sm">Create your first project to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Dropdown */}
          <div className="hidden sm:block absolute top-full left-0 mt-1 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-[1100] max-h-96 overflow-y-auto">
            {/* Create New Project Button */}
            <div className="p-3 border-b">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center space-x-2 p-3 bg-blue-50 border border-dashed border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Create New Project</span>
              </button>
            </div>

            {/* Projects List */}
            <div className="max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <div key={project.id}>
                  {editingProject?.id === project.id ? (
                    <form onSubmit={handleUpdateProject} className="p-3 border-b bg-gray-50">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Project name"
                          required
                          autoFocus
                        />
                        {updateProjectError && (
                          <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                            {updateProjectError}
                          </p>
                        )}
                        <textarea
                          value={newProjectDescription}
                          onChange={(e) => setNewProjectDescription(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Description (optional)"
                          rows={2}
                        />
                        <div className="flex space-x-1">
                          <button
                            type="submit"
                            className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="flex-1 py-1 px-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                        currentProject?.id === project.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => {
                        onProjectSelect(project)
                        setIsOpen(false)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <h3 className="text-sm font-medium text-gray-900 truncate">{project.name}</h3>
                          </div>
                          {project.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(project)
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Edit project"
                          >
                            <Edit2 className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project)
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {projects.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No projects yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {showCreateForm && (
        <>
          {/* Mobile: Full screen modal */}
          <div className="fixed inset-0 z-[2001] bg-white sm:hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Create New Project</h2>
                <button
                  onClick={cancelCreate}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter project name"
                      required
                      autoFocus
                    />
                    {createProjectError && (
                      <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        {createProjectError}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter project description (optional)"
                    />
                  </div>
                </div>

                <div className="p-4 border-t space-y-3">
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || isCreating}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Create Project</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Desktop: Centered modal */}
          <div className="hidden sm:flex fixed inset-0 z-[2001] items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Create New Project</h2>
                <button
                  onClick={cancelCreate}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                    required
                    autoFocus
                  />
                  {createProjectError && (
                    <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {createProjectError}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project description (optional)"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || isCreating}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1000]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}