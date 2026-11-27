export type SourceType = 'interview' | 'observation' | 'pdf' | 'web' | 'text'

/** Who produced an item, and what the researcher decided about it. */
export type Status = 'suggested' | 'confirmed' | 'edited' | 'rejected'
export type Origin = 'ai' | 'researcher'

export interface Source {
  id: string
  title: string
  type: SourceType
  participant?: string
  url?: string
  content: string
  addedAt: number
}

export interface Evidence {
  id: string
  sourceId: string
  /** Verbatim text from the source. */
  quote: string
  rationale?: string
  note?: string
  origin: Origin
  status: Status
}

export interface Theme {
  id: string
  name: string
  description?: string
  evidenceIds: string[]
  origin: Origin
  status: Status
  /** Locked themes are never changed by AI re-clustering. */
  locked: boolean
  isNew?: boolean
}

export interface InsightVersion {
  statement: string
  at: number
  actor: Origin
  reason?: string
}

export interface Insight {
  id: string
  statement: string
  themeIds: string[]
  supporting: string[]
  counter: string[]
  origin: Origin
  status: Status
  decisionNote?: string
  /** Earlier wordings, oldest first. */
  versions?: InsightVersion[]
  /** Set when something it depends on changed, e.g. a source was deleted. */
  needsReview?: string
  isNew?: boolean
}

/** A quote the AI proposed that did not appear in the source, so it was blocked. */
export interface Intercepted {
  id: string
  sourceId: string
  quote: string
  at: number
}

export interface LogEntry {
  id: string
  at: number
  actor: Origin
  text: string
  target?: { kind: 'source' | 'evidence' | 'theme' | 'insight'; id: string }
}

export interface RunSummary {
  at: number
  lines: string[]
}

export interface Project {
  name: string
  question: string
  isDemo: boolean
  sources: Source[]
  evidence: Evidence[]
  themes: Theme[]
  insights: Insight[]
  intercepted: Intercepted[]
  log: LogEntry[]
  lastRun?: RunSummary
}

export type Provider = 'anthropic' | 'openai'

export interface Settings {
  provider: Provider
  apiKey: string
  model: string
}

export type View = 'overview' | 'sources' | 'evidence' | 'themes' | 'workspace' | 'validate' | 'export'
