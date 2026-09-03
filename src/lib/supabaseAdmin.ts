import { createClient } from '@supabase/supabase-js';

// Uses the SUPABASE_SERVICE_ROLE_KEY — server-only secret
const url = process.env.SUPABASE_URL || '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceRole) {
  // we do not throw at import time to avoid breaking dev when env not set,
  // but API routes will check and error clearly.
}

export function getSupabaseAdmin() {
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }
  return createClient(url, serviceRole);
}
