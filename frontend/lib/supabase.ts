/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Accessing environment variables set in frontend/.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ezemctappnoeggmuosco.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_I0392wUbBk6QSIdhSyOnXw_uv0kagvM';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
