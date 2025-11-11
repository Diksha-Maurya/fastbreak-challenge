import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const createSupabaseServer = async () => {
  // In Next 16 this can be Promise<ReadonlyRequestCookies> in some contexts
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},    // no-op in Server Components
        remove: () => {}, // no-op in Server Components
      },
    }
  )
}
