'use client'
import { useState } from 'react'
import Link from 'next/link'

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
    const json = await r.json();
    if (Array.isArray(json.results)) {
      const top = json.results[0];
      const topSim = 1 - (top?.distance ?? 1);      // [-1, 1]
      const topConf = (topSim + 1) / 2;             // [0, 1]
       const showAlternatives = topConf < 0.75;      
      setRes({
        template: top?.template ?? "No match found",
        confidence: topConf,
        parsedConstraint: top?.text ?? null,
        parameters: {},
            alternatives: showAlternatives ? json.results.map((r: any, i: number) => {
            const sim = 1 - r.distance;
            const conf = (sim + 1) / 2;
            return {
              reason: `Match ${i + 1}`,
              parsedConstraint: r.text,
              confidence: conf,
            };
          }) : [],
        });
      } else {
        setError("Unexpected response format");
      }
    setLoading(false);
  }

  return (
    <main className="p-6 space-y-4 bg-white text-black dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Constraint Search</h1>
        <Link 
          href="/auth/sign-out"
          className="rounded bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-sm"
        >
          Sign Out
        </Link>
      </div>
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
        <div className="rounded border p-4 space-y-2 bg-white text-black dark:bg-gray-800 dark:text-gray-100">
          <p><strong>Matched Template:</strong> {res.template}</p>
          <p><strong>Confidence:</strong> {res.confidence.toFixed(2)}</p>
          <p><strong>Parsed Constraint:</strong> {res.parsedConstraint}</p>
          <div>
            <strong>Parameters:</strong>
            <pre className="bg-gray-100 dark:bg-gray-700 text-black dark:text-gray-100 mt-1 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(res.parameters, null, 2)}</pre>
          </div>
          {!!res.alternatives?.length && (
            <div>
              <strong>Alternatives:</strong>
              <pre className="bg-gray-100 dark:bg-gray-700 text-black dark:text-gray-100 mt-1 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(res.alternatives, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
