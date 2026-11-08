import { createClient } from '@supabase/supabase-js';

// Public browser credentials only. Never place a service-role key in NEXT_PUBLIC_*.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-public-anon-key';

export const supabase = createClient(url, key);
export const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
