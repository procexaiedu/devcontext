import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const createDynamicClient = (url: string, key: string, schema: string = 'public'): SupabaseClient<any, string, any> | null => {
  if (!url || !key) return null;
  try {
    return createClient(url, key, { db: { schema: schema } });
  } catch (e) {
    console.warn("Invalid Supabase credentials format");
    return null;
  }
};
