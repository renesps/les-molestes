// Tipos de los JSON generados por scripts/build_data.py

export type Outcome = 'V' | 'E' | 'D'

export interface Record {
  played: number
  won: number
  drawn: number
  lost: number
  unknown: number
  goalsFor: number
  goalsAgainst: number
}

export interface MatchSummary {
  id: number
  date: string // ISO con zona, ej. 2016-03-12T13:00:00-03:00
  year: number
  circuitId: number
  tournamentId: number
  rivalId: number
  matchday: number | null
  cupRound: string | null
  goalsFor: number | null
  goalsAgainst: number | null
  outcome: Outcome | null
  hasMedia: boolean
  videoGoals: number
  goalsDetailed: number
}

export interface GoalVideo {
  previewUrl: string
  viewUrl: string
  fileId: string
}

export interface Goal {
  id: number
  playerId: number | null
  ownGoal: boolean
  assistId: number | null
  penalty: boolean
  freeKick: boolean
  period: string | null
  scoreAfter: string | null
  video: GoalVideo | null
}

export interface MatchDetail extends Omit<MatchSummary, 'hasMedia' | 'videoGoals'> {
  outcomeSource: 'marcador' | 'campo_final' | null
  courtId: number | null
  shirtId: number | null
  goalkeeperId: number | null
  weather: string | null
  formation: string | null
  notes: string | null
  starters: number[]
  bench: number[]
  goals: Goal[]
  yellowCards: { playerId: number }[]
  redCards: { playerId: number; kind: string | null }[]
  media: { folderId: string; folderUrl: string; source: 'db_link' | 'inferred_by_date_and_rival'; title: string } | null
}

export interface Player {
  id: number
  name: string
  number: number | null
  matches: number
  starts: number
  benchApps: number
  goals: number
  assists: number
  penaltyGoals: number
  freeKickGoals: number
  yellowCards: number
  redCards: number
  firstYear: number | null
  lastYear: number | null
  years: number[]
  circuits: number[]
  firstMatchId: number | null
  lastMatchId: number | null
  matchIds: number[]
  videoGoals: { goalId: number; matchId: number }[]
  goalkeeper: { matches: number; goalsAgainst: number; cleanSheets: number } | null
}

export interface Team {
  id: number
  name: string
  record: Record
  matchIds: number[]
  circuits: number[]
}

export interface DriveFolder {
  folderId: string
  folderUrl: string
  title: string
}

export interface Tournament {
  id: number
  circuitId: number
  year: number
  edition: number
  code: string
  name: string
  position: number | null
  zone: string | null
  isCup: boolean
  isTitle: boolean
  record: Record
  matchIds: number[]
  firstDate: string | null
  lastDate: string | null
  unloadedMatchFolders: DriveFolder[]
  celebrationFolder: DriveFolder | null
}

export interface Circuit {
  id: number
  name: string
  short: string
  record: Record
  tournamentIds: number[]
}

export interface Title {
  code: string
  label: string
  tournamentId: number
  circuitId: number
  name: string
  zone: string | null
  positionInDb: number | null
  record: Record
  matchIds: number[]
  celebrationFolder: DriveFolder | null
}

export interface RankingRow {
  playerId: number
  name: string
  value: number
}

export interface Lookups {
  courts: { id: number; name: string; number: number; circuitId: number }[]
  shirts: { id: number; name: string }[]
  circuits: { id: number; name: string; short: string }[]
}

export interface Meta {
  clubName: string
  shortName: string
  generatedAt: string
  firstMatchDate: string
  lastMatchDate: string
  counts: {
    matches: number
    goals: number
    goalsWithVideo: number
    distinctVideos: number
    matchesWithMedia: number
    players: number
    rivals: number
    tournaments: number
  }
  inconsistencies: number
}

export interface Stats {
  overall: Record
  byCircuit: { [circuitId: string]: Record }
  byYear: { [year: string]: Record }
  rankings: {
    scorers: RankingRow[]
    assists: RankingRow[]
    appearances: RankingRow[]
    yellowCards: RankingRow[]
    redCards: RankingRow[]
    goalkeepers: { playerId: number; name: string; matches: number; goalsAgainst: number; cleanSheets: number }[]
    scorersByCircuit: { [id: string]: RankingRow[] }
    scorersByYear: { [year: string]: RankingRow[] }
    scorersByTournament: { [id: string]: RankingRow[] }
  }
  curiosities: unknown // se tipa en la pantalla de curiosidades
}
