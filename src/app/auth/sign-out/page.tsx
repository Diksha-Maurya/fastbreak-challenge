'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function SignOutPage() {
  const supabase = createSupabaseClient()
  const router = useRouter()
  useEffect(() => {
    (async () => {
      await supabase.auth.signOut()
      router.replace('/auth/sign-in')
    })()
  }, [router, supabase])

  return <div className="p-6">Signing out…</div>
}
