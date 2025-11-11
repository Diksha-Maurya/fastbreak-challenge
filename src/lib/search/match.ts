import { ParsedResult, TemplateId } from './types'
import { extractMinMax, extractTeams, extractRounds, extractNetworks, extractGames, extractVenues } from './extract'

const TEMPLATES: Record<TemplateId, { name: string; detector: (q: string)=>number; builder: (q: string)=>ParsedResult }> = {
  game: {
    name: 'Template 1: Game Scheduling Constraints',
    detector: (q) => {
      // game-level signals
      let score = 0
      if (/rivalry|matchups?|@|byes?/i.test(q)) score += 0.6
      if (/schedule|scheduled|don'?t schedule|do not schedule/i.test(q)) score += 0.3
      if (/espn|cbs|fox|tnt|abc|nbc/i.test(q)) score += 0.2
      if (/week(end|day)|final\s+(two|2)\s+(weeks?|dates?)/i.test(q)) score += 0.2
      return Math.min(score, 1)
    },
    builder: (q) => {
      const { min, max } = extractMinMax(q)
      const rounds = extractRounds(q)
      const networks = extractNetworks(q)
      const games = extractGames(q)
      const venues = extractVenues(q)

      const parsedConstraint = `Ensure that at least ${min ?? 1} and at most ${max ?? 999} games from ${games.join(', ')} are scheduled across ${rounds.join(', ')} and played in any venue from ${venues.join(', ')} and assigned to any of ${networks.join(', ')}.`
      return {
        template: 'Template 1: Game Scheduling Constraints',
        confidence: 0.75,
        parsedConstraint,
        parameters: { min: min ?? 1, max: max ?? 999, games, rounds, venues, networks },
        alternatives: []
      }
    }
  },
  sequence: {
    name: 'Template 2: Sequence Constraints',
    detector: (q) => {
      let score = 0
      if (/back-?to-?back|back to back|in\s+back-?to-?back\s+weeks/i.test(q)) score += 0.6
      if (/on either side of their bye|around their bye|before and after the bye/i.test(q)) score += 0.6
      if (/second half|across rounds/i.test(q)) score += 0.2
      return Math.min(score, 1)
    },
    builder: (q) => {
      const teams = extractTeams(q)
      const rounds = extractRounds(q)
      const parsedConstraint = `Ensure at least 0 and at most 999 cases where there is a sequence for ${teams.join(', ') || 'specified teams'} across rounds ${rounds.join(', ')}.`
      return {
        template: 'Template 2: Sequence Constraints',
        confidence: 0.7,
        parsedConstraint,
        parameters: { min: 0, max: 999, teams, rounds },
        alternatives: []
      }
    }
  },
  pattern: {
    name: 'Template 3: Team Schedule Pattern Constraints',
    detector: (q) => {
      let score = 0
      if (/cases?\s+of\s+\d+\s+(home|away|games?)\s+in\s+\d+\s+(nights?|rounds?)/i.test(q)) score += 0.6
      if (/for any|for all|for each|conference teams|nba team/i.test(q)) score += 0.4
      return Math.min(score, 1)
    },
    builder: (q) => {
      const { min, max } = extractMinMax(q)
      const rounds = extractRounds(q)
      const networks = extractNetworks(q)
      const venues = extractVenues(q)
      const kMatch = q.match(/(\d+)\s+(home|away|bye|active)\s+games?/i)
      const mMatch = q.match(/in\s+(\d+)\s+(nights?|rounds?)/i)
      const k = kMatch ? Number(kMatch[1]) : 3
      const kind = kMatch ? kMatch[2] : 'away'
      const m = mMatch ? Number(mMatch[1]) : 4

      const parsedConstraint = `Ensure that each of teams have at least ${min ?? 0} and at most ${max ?? 2} instances where they play at least ${k} and at most ${m} ${kind} games across ${rounds.join(', ')} where the game is assigned to any of ${networks.join(', ')} and played in any venue from ${venues.join(', ')}.`
      return {
        template: 'Template 3: Team Schedule Pattern Constraints',
        confidence: 0.72,
        parsedConstraint,
        parameters: { scope: 'each', min: min ?? 0, max: max ?? 2, k, m, kind, rounds, networks, venues },
        alternatives: []
      }
    }
  }
}

export function classifyAndBuild(query: string): ParsedResult {
  const scores = (Object.keys(TEMPLATES) as TemplateId[]).map(id => ({
    id, score: TEMPLATES[id].detector(query)
  }))
  scores.sort((a,b) => b.score - a.score)

  const top = scores[0]
  const alt = scores[1]
  const primary = TEMPLATES[top.id].builder(query)
  primary.confidence = Math.min(0.6 + top.score * 0.4, 0.99)

  if (alt && alt.score > 0.3) {
    const altBuilt = TEMPLATES[alt.id].builder(query)
    primary.alternatives.push({
      reason: `Also matched ${TEMPLATES[alt.id].name} with score ${alt.score.toFixed(2)}`,
      parsedConstraint: altBuilt.parsedConstraint!,
      confidence: Math.min(0.5 + alt.score * 0.4, 0.9)
    })
  }

  primary.debug = { scores }
  return primary
}
