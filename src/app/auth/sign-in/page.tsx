'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
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
          className="w-full border rounded p-2"
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
