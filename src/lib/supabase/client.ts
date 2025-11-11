import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// You can add <Database> generic later if you generate types.
export const createSupabaseClient = () => createClientComponentClient();
