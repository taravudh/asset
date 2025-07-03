import React, { useState } from 'react'
import { Search, X, MapPin } from 'lucide-react'
import { ProjectSelector } from './ProjectSelector'
import { UserMenu } from './Auth/UserMenu'
import { Project } from '../lib/types'

interface HeaderProps {
  onSearch: (query: string) => void
  projects: Project[]
  currentProject: Project | null
  onProjectSelect: (project: Project) => void
  onProjectCreate: (data: { name: string; description?: string }) => Promise<Project>
  onProjectUpdate: (id: string, updates: Partial<Project>) => Promise<Project>
  onProjectDelete: (id: string) => Promise<void>
  projectsLoading?: boolean
  user: {
    id: string
    email: string
    name?: string
  }
  onLogout: () => void
  onOpenAdmin?: () => void
  onSetupSuperAdmin?: () => void
  isAdmin?: boolean
  isSuperAdmin?: boolean
  checkIfProjectNameExistsInDb?: (name: string, excludeId?: string) => Promise<boolean>
}

export function Header({ 
  onSearch, 
  projects,
  currentProject,
  onProjectSelect,
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  projectsLoading = false,
  user,
  onLogout,
  onOpenAdmin,
  onSetupSuperAdmin,
  isAdmin = false,
  isSuperAdmin = false,
  checkIfProjectNameExistsInDb
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
    setShowMobileSearch(false)
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-[1001]">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <h1 className="text-base sm:text-lg font-semibold text-gray-900">Asset Survey</h1>
              </div>
              
              {/* Project Selector - Hidden on mobile when search is open */}
              <div className={`${showMobileSearch ? 'hidden' : 'block'} sm:block`}>
                <ProjectSelector
                  projects={projects}
                  currentProject={currentProject}
                  onProjectSelect={onProjectSelect}
                  onProjectCreate={onProjectCreate}
                  onProjectUpdate={onProjectUpdate}
                  onProjectDelete={onProjectDelete}
                  loading={projectsLoading}
                  checkIfProjectNameExistsInDb={checkIfProjectNameExistsInDb}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Desktop search */}
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-48 lg:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </form>

              {/* Mobile search button */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* User Menu */}
              <UserMenu 
                user={user} 
                onLogout={onLogout} 
                onOpenAdmin={onOpenAdmin}
                onSetupSuperAdmin={onSetupSuperAdmin}
                isAdmin={isAdmin}
                isSuperAdmin={isSuperAdmin}
              />
            </div>
          </div>

          {/* Project info bar - shows current project details */}
          {currentProject && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>
                    <span className="font-medium">Project:</span> {currentProject.name}
                  </span>
                  {currentProject.description && (
                    <span className="hidden sm:inline">
                      <span className="font-medium">Description:</span> {currentProject.description}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">
                  Created {new Date(currentProject.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile search overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[2000] bg-white md:hidden">
          <div className="flex items-center p-3 border-b">
            <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="p-2 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}