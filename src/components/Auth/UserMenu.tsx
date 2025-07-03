import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown, Shield } from 'lucide-react';

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onSetupSuperAdmin?: () => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export function UserMenu({ 
  user, 
  onLogout, 
  onOpenAdmin, 
  onSetupSuperAdmin,
  isAdmin = false,
  isSuperAdmin = false
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="hidden md:block ml-2">
            <div className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
              {user.name || user.email.split('@')[0]}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[120px]">
              {user.email}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-gray-900 truncate">
                  {user.name || user.email.split('@')[0]}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {user.email}
                </div>
                {(isAdmin || isSuperAdmin) && (
                  <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    <Shield className="w-3 h-3 mr-1" />
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-1">
            {(isAdmin || isSuperAdmin) && onOpenAdmin && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Shield className="w-4 h-4 mr-3 text-purple-600" />
                Admin Dashboard
              </button>
            )}
            
            {!isSuperAdmin && onSetupSuperAdmin && (
              <button
                onClick={() => {
                  onSetupSuperAdmin();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Settings className="w-4 h-4 mr-3 text-gray-500" />
                Setup Admin
              </button>
            )}
            
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}