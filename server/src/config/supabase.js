import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Klien ini memakai service_role key sehingga melewati Row Level Security.
// Hanya boleh dipakai di server, jangan pernah dikirim ke browser.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
