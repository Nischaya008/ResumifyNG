/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase URL - will use Cloudflare Worker proxy in production to bypass India block
// After deploying worker, update VITE_SUPABASE_URL to your worker URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ezemctappnoeggmuosco.supabase.co';

// Anon key remains the same - it's safe to use through proxy
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1jdGFwcG5vZWdnbXVvc2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjMxMjAsImV4cCI6MjA4NzEzOTEyMH0.WwfuHgcnsVp_HwCdpPBwyf_RCMqZ8MK-U9HZSct4dQo';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Backend API URL for OAuth
export const API_URL = import.meta.env.VITE_API_URL || 'https://resumifyng-backend-zjlv.onrender.com';
