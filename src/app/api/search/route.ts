import 'dotenv/config'
import axios from 'axios'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const JINA_API = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v4'
const HEADERS = { Authorization: `Bearer ${process.env.JINA_API_KEY}` }

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 })
    }
    // 1) Get embedding from Jina AI
    const { data } = await axios.post(
      JINA_API,
      { input: [query], model: JINA_MODEL, dimensions: 1024 },
      { headers: HEADERS }
    )
    const qEmb: number[] = data.data[0].embedding

    // 2) Vector search in Supabase
    const { data: rows, error } = await supabase.rpc('search_constraints', {
      q: qEmb,
      k: 5,
    })
    if (error) throw error

    const qt = query.toLowerCase()

    function nudge(template: string): number {
    const isT1 = /Template 1: /.test(template)
    const isT2 = /Template 2: /.test(template)
    const isT3 = /Template 3: /.test(template)

    const hasSequenceWords =
      /(back[\s-]?to[\s-]?back|consecutive|sequence)/.test(qt)

    const hasByeSequence =
      /(either side of .*bye|either side of their bye|before their bye|after their bye|bye week)/.test(qt)

    const hasTeamPattern =
      /(each team|every team|for teams|no team|per[-\s]?team)/.test(qt) &&
      /(home|away|bye|active)/.test(qt)

    let bump = 0

    // 1) True sequence / bye-sequence → favor Template 2, slightly penalize T1
    if ((hasSequenceWords || hasByeSequence) && isT2) bump += 0.10
    if ((hasSequenceWords || hasByeSequence) && isT1) bump -= 0.05

    // 2) Per-team schedule pattern → favor Template 3, slightly penalize T2
    if (hasTeamPattern && isT3) bump += 0.10
    if (hasTeamPattern && isT2) bump -= 0.05

    // 3) Generic scheduling (no sequence, no team-pattern) with obvious sched words → tiny nudge to T1
    if (!hasSequenceWords && !hasByeSequence && !hasTeamPattern && isT1 &&
        /(espn|cbs|network|venue|rivalry|schedule)/.test(qt)) {
      bump += 0.01
  }

  return bump
}

    const adjusted = (rows ?? [])
      .map((r: any) => ({
        ...r,
        distance: Math.max(0, r.distance - nudge(r.template)),
      }))
      .sort((a: any, b: any) => a.distance - b.distance)

    // 4) Return shape your UI expects
    return NextResponse.json({ results: adjusted }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'search_failed' }, { status: 500 })
  }
}
