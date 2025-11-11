const TEAM_TOKEN = /[A-Z]{2,4}/g // e.g., UTN, VU, ALA, AU, MSU, UM, PSU, UCLA
const NETWORKS = ['ESPN','CBS','FOX','TNT','ABC','NBC']
const VENUES = ['all_venues'] // MVP placeholder
const WEEKEND_WORDS = /(weekend|sat(urday)?|sun(day)?)/i
const WEEKDAY_WORDS = /(weekday|mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?)/i

export function extractMinMax(text: string) {
  // patterns like "at least 2", "at most 3", "no cases", "don't schedule"
  const t = text.toLowerCase()
  let min: number | null = null
  let max: number | null = null

  const atLeast = t.match(/at\s+least\s+(\d+)/)
  if (atLeast) min = Number(atLeast[1])
  const atMost = t.match(/at\s+most\s+(\d+)/)
  if (atMost) max = Number(atMost[1])

  if (/no cases?|none|zero|don'?t schedule|do not schedule/.test(t)) {
    min = 0; max = 0
  }
  return { min, max }
}

export function extractTeams(text: string) {
  // crude team-code capture; refine later with dictionary
  const codes = text.toUpperCase().match(TEAM_TOKEN) ?? []
  // De-dup while preserving order
  return Array.from(new Set(codes))
}

export function extractRounds(text: string) {
  const t = text.toLowerCase()
  const rounds: string[] = []
  if (WEEKEND_WORDS.test(t)) rounds.push('weekend_rounds')
  if (WEEKDAY_WORDS.test(t)) rounds.push('weekday_rounds')
  if (/final\s+(?:\d+|two|2)\s+(dates?|weeks?|rounds?)\s+of\s+the\s+season/.test(t)) rounds.push('final_two_rounds')
  if (/second\s+half/.test(t)) rounds.push('second_half')
  return rounds.length ? rounds : ['all_rounds']
}

export function extractNetworks(text: string) {
  const found = NETWORKS.filter(n => new RegExp(`\\b${n}\\b`, 'i').test(text))
  return found.length ? found : ['any_network']
}

export function extractGames(text: string) {
  // identify "rivalry games", explicit matchups, or byes
  const games: string[] = []
  if (/rivalry\s+games?/i.test(text)) games.push('rivalry_games')
  const matchups = text.match(/([A-Z]{2,4})@([A-Z]{2,4})/g) || []
  if (matchups.length) games.push(...matchups)
  if (/bye(s)?/i.test(text)) games.push('byes')
  return games.length ? games : ['all_games']
}

export function extractVenues(_text: string) {
  // MVP: keep simple
  return ['all_venues']
}
