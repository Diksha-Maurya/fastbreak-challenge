'use client'
import { useState } from 'react'
import Link from 'next/link'

type ApiResult = {
  template: string; confidence: number; parsedConstraint: string | null;
  parameters: Record<string, any>;
  alternatives: { reason: string; parsedConstraint: string; confidence: number }[];
}

type ConstraintParams = {
  min: number | null
  max: number | null
  games?: string[]
  rounds?: string[]
  venues?: string[]
  networks?: string[]
  teams?: string[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function extractParameters(template: string, query: string): ConstraintParams {
  const q = query.toLowerCase()

  const nums = Array.from(q.matchAll(/\b\d+\b/g)).map(m => parseInt(m[0], 10))
  let min: number | null = null
  let max: number | null = null
  if (nums.length === 1) {
    min = nums[0]
    max = 999
  } else if (nums.length >= 2) {
    min = nums[0]
    max = nums[1]
  }

  const games: string[] = []
  const rounds: string[] = []
  const venues: string[] = []
  const networks: string[] = []
  const teams: string[] = []

  if (/rivalry/.test(q)) games.push('rivalry_games')
  if (/high profile/.test(q)) games.push('high_profile_games')

  const matchupRe = /\b[A-Z]{2,4}@[A-Z]{2,4}\b/g
  const matchupMatches = query.match(matchupRe)
  if (matchupMatches) {
    games.push(...matchupMatches)
  }
  if (/home games/.test(q)) venues.push('home_venues')
  if (/away games/.test(q)) venues.push('away_venues')
  if (/neutral site/.test(q)) venues.push('neutral_venues')
  if (/weekend/.test(q)) rounds.push('weekend_rounds')
  if (/weekday/.test(q)) rounds.push('weekday_rounds')
  if (/final (two|2) (dates|weeks)/.test(q)) rounds.push('final_two_rounds')
  if (/second half/.test(q)) rounds.push('second_half_rounds')
  if (/(either side of .*bye|before their bye|after their bye|bye week)/.test(q)) {
    rounds.push('round_before_bye', 'round_after_bye')
  }

  const networkRe = /\b(espn|cbs|fox|abc|sec network)\b/gi
  const netMatches = query.match(networkRe)
  if (netMatches) {
    networks.push(...Array.from(new Set(netMatches.map(n => n.toUpperCase()))))
  }
  // TEAM extraction
  // Handle known multi-word team names first
  const multiTeamPatterns: { [key: string]: RegExp } = {
   'Penn State': /\bPenn State\b/gi,
  'Florida State': /\bFlorida State\b/gi,
  'Arizona State': /\bArizona State\b/gi,
  'Washington State': /\bWashington State\b/gi,
  'Oregon State': /\bOregon State\b/gi,
  }

  for (const [name, re] of Object.entries(multiTeamPatterns)) {
    if (re.test(query)) {
      teams.push(name)
    }
  }

  const multiWordTeamRe = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g
  const multiWordTeams: string[] = []
  let mwMatch

  while ((mwMatch = multiWordTeamRe.exec(query)) !== null) {
    multiWordTeams.push(mwMatch[1]) // e.g. "Western Conference"
  }

  teams.push(...multiWordTeams)

  const stopWords = new Set([
    'make', 'sure', 'do', 'not', 'play', 'plays', 'at', 'home', 'on',
    'either', 'side', 'their', 'week', 'weeks', 'the', 'and', 'or', 'of',
    'in', 'across', 'ensure', 'schedule', 'guarantee', 'require', 'for',
    'each', 'that', 'least', 'most', 'min', 'max', 'game', 'games',
    'round', 'rounds', 'bye', 'weekend', 'weekday',
    'cbs', 'espn', 'fox', 'abc'
  ])

  for (const name of multiWordTeams) {
    for (const piece of name.toLowerCase().split(/\s+/)) {
      stopWords.add(piece) 
    }
  }

  const singleWordTeamRe = /\b([A-Z][a-z]+|[A-Z]{2,4})\b/g
  const teamMatches = query.match(singleWordTeamRe)

  if (teamMatches) {
    teams.push(
      ...Array.from(
        new Set(
          teamMatches.filter(t => !stopWords.has(t.toLowerCase()))
        )
      )
    )
  }

  if (template.startsWith('Template 1')) {
    if (!rounds.length) rounds.push('all_rounds')
    if (!venues.length) venues.push('all_venues')
    if (!games.length && matchupMatches) {
      games.push(...matchupMatches)
    }
  }

  return { min, max, games, rounds, venues, networks, teams }
}

function buildParsedConstraint(template: string, params: ConstraintParams): string {
  const min = params.min ?? 1
  const max = params.max ?? 999

  if (template.startsWith('Template 1')) {
    const games = params.games && params.games.length ? params.games.join(', ') : '<games>'
    const rounds = params.rounds && params.rounds.length ? params.rounds.join(', ') : '<rounds>'
    const venues = params.venues && params.venues.length ? params.venues.join(', ') : 'all_venues'
    const networks = params.networks && params.networks.length ? params.networks.join(', ') : '<networks>'

    return `Ensure that at least ${min} and at most ${max} games from ${games} are scheduled across ${rounds} and played in any venue from ${venues} and assigned to any of ${networks}.`
  }

  if (template.startsWith('Template 2')) {
    const rounds = params.rounds && params.rounds.length ? params.rounds.join(', ') : '<round1>, <round2>'
    const games = params.games && params.games.length ? params.games.join(', ') : '<games or matchups or byes>'

    return `Ensure at least ${min} and at most ${max} cases where there is a sequence ${games}, ${games}, ... across rounds ${rounds}.`
  }

  if (template.startsWith('Template 3')) {
    const teams = params.teams && params.teams.length ? params.teams.join(', ') : '<teams>'
    const rounds = params.rounds && params.rounds.length ? params.rounds.join(', ') : '<rounds>'

    return `Ensure that each of teams in ${teams} have at least ${min} and at most ${max} instances where they play <home/away/bye/active> across ${rounds}.`
  }
  return 'Unable to build parsed constraint for this template.'
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
    if (Array.isArray(json.results) && json.results.length > 0) {
  const top = json.results[0]
  const topSim = 1 - (top?.distance ?? 1)      // [-1, 1]
  const topConf = (topSim + 1) / 2             // [0, 1]

  // Only show alternatives when confidence is low
  const showAlternatives = topConf < 0.75

  const alternatives = showAlternatives
    ? json.results.slice(1).map((r: any, i: number) => {
        const sim = 1 - r.distance
        const conf = (sim + 1) / 2
        return {
          reason: `Match ${i + 2}`,
          parsedConstraint: r.text,
          confidence: conf,
        }
      })
    : []

  const templateLabel = top?.template ?? 'Unknown template'
const params = extractParameters(templateLabel, q)

// consider it "empty" if we couldn't extract anything meaningful
const emptyParams =
  params.min === null &&
  params.max === null &&
  (!params.games || params.games.length === 0) &&
  (!params.rounds || params.rounds.length === 0) &&
  (!params.venues || params.venues.length === 0) &&
  (!params.networks || params.networks.length === 0) &&
  (!params.teams || params.teams.length === 0)

// if low confidence OR no parameters, show a friendly error instead of a fake constraint
if (topConf < 0.7 || emptyParams) {
  setError(
    'I couldn’t confidently extract a structured constraint from that query. ' +
    'Try phrasing it more like: "At most 2 cases of 3 away games in 4 rounds for Western Conference teams."'
  )
  setLoading(false)
  return
}

const parsed = buildParsedConstraint(templateLabel, params)

setRes({
  template: templateLabel,
  confidence: topConf,
  parsedConstraint: parsed,
  parameters: params,
  alternatives,
})

} else {
  setError('Unexpected response format')
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
          className="flex-1 rounded border border-gray-500
          bg-white
          px-3 py-2
          text-black placeholder:text-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500"
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
