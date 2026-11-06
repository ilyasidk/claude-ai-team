export type Limits = { raw: string; at: number; claude: { kind: string; percentUsed: number; resetsAt?: string }[] }
export type Act = { tool: string; detail: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'limits-widget': { data: Limits; act: Act }
  }
}
