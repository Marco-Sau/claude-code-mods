export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Stats = {
  model: string | null
  effort: string | null
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number | null
  limits: Limit[]
}

declare module 'claude-code' {
  interface PluginState {
    'session-stats': { stats: Stats }
  }
}
