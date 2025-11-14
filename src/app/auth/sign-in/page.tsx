'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    });
    setLoading(false)
    if (error) alert(error.message)
    else alert('Magic link sent! Check your email.')
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Sign in</h1>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded border border-gray-500
                        bg-white
                        px-3 py-2
                        text-black placeholder:text-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black text-white py-2"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
    </div>
  )
}
