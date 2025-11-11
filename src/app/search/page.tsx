'use client'
import { useState } from 'react'

type ApiResult = {
  template: string; confidence: number; parsedConstraint: string | null;
  parameters: Record<string, any>;
  alternatives: { reason: string; parsedConstraint: string; confidence: number }[];
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null); setRes(null)
    const r = await fetch('/api/search', { method: 'POST', body: JSON.stringify({ query: q }) })
    if (!r.ok) { setError('Request failed'); setLoading(false); return }
    const json = await r.json()
    setRes(json); setLoading(false)
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Constraint Search</h1>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q} onChange={e=>setQ(e.target.value)}
          placeholder='e.g. "Ensure all rivalry games on a weekend on ESPN"'
          className="flex-1 border rounded p-2"
        />
        <button className="rounded bg-black text-white px-4">Search</button>
      </form>

      {loading && <p>Searching…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {res && (
        <div className="rounded border p-4 space-y-2">
          <p><strong>Matched Template:</strong> {res.template}</p>
          <p><strong>Confidence:</strong> {res.confidence.toFixed(2)}</p>
          <p><strong>Parsed Constraint:</strong> {res.parsedConstraint}</p>
          <div>
            <strong>Parameters:</strong>
            <pre className="bg-gray-50 mt-1 p-2 rounded text-sm overflow-auto">{JSON.stringify(res.parameters, null, 2)}</pre>
          </div>
          {!!res.alternatives?.length && (
            <div>
              <strong>Alternatives:</strong>
              <pre className="bg-gray-50 mt-1 p-2 rounded text-sm overflow-auto">{JSON.stringify(res.alternatives, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
