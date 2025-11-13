import 'dotenv/config'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const JINA_API = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'
const HEADERS = { Authorization: `Bearer ${process.env.JINA_API_KEY}` }

async function embed(texts: string[]) {
  const { data } = await axios.post(
    JINA_API,
    { input: texts, model: JINA_MODEL },
    { headers: HEADERS }
  )
  return data.data.map((d: any) => d.embedding as number[])
}

async function idOf(name: string) {
  const { data, error } = await supabase
    .from('templates')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (error || !data) throw new Error(`Template not found: ${name}`)
  return data.id
}

async function upsert(templateName: string, texts: string[]) {
  const templateId = await idOf(templateName)
  const embs = await embed(texts)

  const rows = texts.map((text, i) => ({
    template_id: templateId,
    text,
    emb: embs[i] as any,
  }))

  const { error } = await supabase
    .from('constraints_corpus')
    .upsert(rows, { onConflict: 'template_id,text' })
  if (error) throw error

  console.log(`✅ ${templateName}: +${rows.length}`)
}

async function main() {
  await upsert('Game Scheduling Constraints', [
    'Ensure that at least <min> and at most <max> games from <games or matchups or byes> are scheduled across <rounds> and played in any venue from <venues> and assigned to any of <networks>.',

    'Schedule between <min> and <max> <games or matchups or byes> across <rounds>, at any venue in <venues>, and on any of <networks>.',
    'Across <rounds>, ensure the count of <games or matchups or byes> is within [<min>, <max>], with games at venues from <venues> and carried by <networks>.',
    'Make sure at least <min> and at most <max> <games or matchups or byes> occur over <rounds>, played at <venues> and assigned to <networks>.',

    'At least <min> of <games or matchups or byes> should be scheduled on the final <k> dates of the season and on either <networks>.',
    'Schedule at least <min> of <games or matchups or byes> on the final <k> dates of the season and carry them on <networks> such as CBS or ESPN.',
    'Ensure at least <min> of specific matchups like UTN@VU, ALA@AU, MSU@UM are scheduled within the final <k> dates of the season and broadcast on <networks> (for example CBS or ESPN).',

    'Ensure all rivalry <games or matchups or byes> are scheduled on weekend <rounds> and aired on <networks>.',
    'Do not schedule any high profile <games or matchups or byes> on weekday <rounds> on <networks>; they should be placed on weekend <rounds> instead.'
  ])

  await upsert('Sequence Constraints', [
  'Ensure at least <min> and at most <max> cases where there is a sequence <games or matchups or byes>, <games or matchups or byes>, ... across rounds <round1>, <round2>.',

  'Across rounds <round1>, <round2>, require between <min> and <max> occurrences of the sequence <games or matchups or byes>, <games or matchups or byes>, ....',
  'Guarantee that the number of sequences <games or matchups or byes>, <games or matchups or byes>, ... over rounds <round1>, <round2> lies within [<min>, <max>].',
  'Ensure the sequence pattern of <games or matchups or byes> across <round1>, <round2> appears at least <min> and at most <max> times.',

  'Ensure that for selected teams in <teams>, there are at least <min> and at most <max> cases where they do not have a home game in the round before their bye and the round after their bye.',
  'Make sure the sequence of rounds immediately before and after a bye week (rounds <round_before_bye>, <round_after_bye>) satisfies a constraint on where <games or matchups or byes> are played.',

  'Require between <min> and <max> cases where a team plays at two specified opponents in back-to-back weeks in the second half of the season.',
  'Ensure that there are at least <min> and at most <max> sequences where a team is scheduled for consecutive away <games or matchups or byes> at different opponents across rounds <round1>, <round2>.',
  'Across rounds <round1>, <round2>, require the sequence <team @ opp1>, <team @ opp2> in adjacent weeks.',
  'Guarantee that consecutive-week sequences involving specified opponents occur between <min> and <max> times in the latter half of the season.'
])

  await upsert('Team Schedule Pattern Constraints', [
    'Ensure that <each of/all> teams in <teams> have at least <min> and at most <max> instances where they play <home/away/bye/active> across <rounds> at venues <venues> on <networks>.',

    'For teams in <teams>, enforce between <min> and <max> occurrences of <home/away/bye/active> across <rounds>, at <venues>, on <networks>.',
    'Each team in <teams> should meet the range [<min>, <max>] for <home/away/bye/active> appearances across <rounds>, scheduled at <venues> and broadcast on <networks>.',
    'Make sure every team in <teams> has at least <min> and at most <max> <home/away/bye/active> slots over <rounds>, using venues <venues> and networks <networks>.',

    'Ensure that each team in <teams> has at most <max> weekday <home/away/bye/active> games across early <rounds> and at least <min> weekend games on <networks>.',
    'Require that no team in <teams> has more than <max> consecutive <away> games across <rounds> at <venues>.',
    'Guarantee that every team in <teams> receives at least <min> bye weeks and at most <max> bye weeks across <rounds>, regardless of <venues> and <networks>.',
    'Ensure each team in <teams> has at least <min> and at most <max> home games across <rounds>, with a balanced distribution over <venues> and televised on <networks>.'
  ])

  console.log('Data Upload Done')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
