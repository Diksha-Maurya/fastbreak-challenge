import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sports Constraint Parser</h1>
      <p>Welcome, {user?.email ?? 'user'}.</p>
      <div className="space-x-3">
        <Link className="underline" href="/auth/sign-out">Sign out</Link>
      </div>
      <div className="rounded border p-4">
        <p className="text-sm text-gray-600">
          ✅ Server component auth is working. Next: search API + parsing.
        </p>
      </div>
    </main>
  )
}
