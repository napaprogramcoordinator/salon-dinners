// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zqpawrdblhxllmfpygkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGF3cmRibGh4bGxtZnB5Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTgyODQsImV4cCI6MjA4MzQ3NDI4NH0.qtekiX3TY-y6T5i1acSNwuXWwaiOL5OVtFbPEODKpvs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  if (error) {
    console.error('Supabase error:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred',
    };
  }
  return { success: true };
};
