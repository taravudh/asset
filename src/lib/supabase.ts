// This file is a placeholder for Supabase integration
// It exports the Project type to maintain compatibility with components
// that expect it from this file

import { Project as ProjectType } from './types';

export type Project = ProjectType;

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Placeholder for future Supabase integration
export const initSupabase = () => {
  console.log('Supabase integration is not currently active');
  return null;
};