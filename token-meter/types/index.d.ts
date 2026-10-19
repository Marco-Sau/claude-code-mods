export type Count = { input: number; output: number }

declare module 'claude-code' {
  interface PluginState {
    'token-meter': { last: Count | null; total: Count & { prompts: number } }
  }
}
