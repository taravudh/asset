import React, { createContext, useState, useEffect } from 'react';
import { authenticateUser, createUser, User } from '../lib/database';

// Define the shape of our context
interface AuthContextType {
  user: Omit<User, 'password'> | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {}
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('assetSurveySession');
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          
          // Check if session is still valid (you could add expiration logic here)
          if (session && session.user) {
            console.log('Restoring session for user:', session.user.id);
            setUser(session.user);
          } else {
            // Clear invalid session
            localStorage.removeItem('assetSurveySession');
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        // Clear potentially corrupted session data
        localStorage.removeItem('assetSurveySession');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const authenticatedUser = await authenticateUser(email, password);
      
      // Save user to state
      setUser(authenticatedUser);
      
      // Save session to localStorage
      localStorage.setItem('assetSurveySession', JSON.stringify({
        user: authenticatedUser,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }));
      
      console.log('User logged in successfully:', authenticatedUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create the user
      await createUser({
        email,
        password,
        name,
        role: 'user'
      });
      
      // After registration, log the user in
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('assetSurveySession');
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Create the context value
  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};