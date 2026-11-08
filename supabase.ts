import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(url, key);
export const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase();
