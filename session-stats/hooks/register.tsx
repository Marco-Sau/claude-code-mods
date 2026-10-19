import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Stats } from '../types'

const stats = atom({ plugin: 'session-stats', key: 'stats' } as const, {
  model: null,
  effort: null,
  contextPercent: null,
  contextTokens: null,
  contextWindow: null,
  limits: [],
} as Stats)

const dots = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const bar = (percent: number, width = 10) => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const tone = (percent: number) => (percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green')

const label = (kind: string) =>
  kind === 'five_hour' ? '5h' : kind === 'seven_day' ? '7d' : kind.replace('_', ' ')

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const two = (n: number) => String(n).padStart(2, '0')

const resetLabel = (iso: string | undefined, now: number) => {
  const at = iso ? Date.parse(iso) : NaN
  const ms = at - now

  if (!Number.isFinite(ms) || ms <= 0) {
    return ''
  }

  const d = new Date(at)
  const minutes = Math.round(ms / 60000)
  const left =
    minutes >= 1440
      ? `${Math.floor(minutes / 1440)}d${Math.floor((minutes % 1440) / 60)}h`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}h${two(minutes % 60)}`
        : `${minutes}m`

  return ` ↻ ${DAYS[d.getDay()]} ${two(d.getDate())}.${two(d.getMonth() + 1)} ${two(d.getHours())}:${two(d.getMinutes())} (${left})`
}

export const register: Register = on => {
  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      await update($, stats, s => ({ ...s, model: e.model, effort: e.effort === undefined ? null : String(e.effort) }))
    }

    yield* next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, stats, s => ({
      ...s,
      contextPercent: e.context.percent ?? null,
      contextTokens: e.context.tokens ?? null,
      contextWindow: e.context.window,
      limits: e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
    }))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const s = await read($, stats)

    if (e.props.hasSurvey || s.model === null) {
      return below
    }

    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const ctx = s.contextPercent

    const mine = (
      <Box borderStyle="round" borderColor="cyan" paddingX={1} gap={2}>
        <Text>
          <Text color="cyan" bold>◈ MODEL </Text>
          <Text bold>{s.model.replace(/^claude-/, '')}</Text>
        </Text>
        <Text>
          <Text color="magenta" bold>✦ EFFORT </Text>
          <Text bold>{s.effort ?? 'default'}</Text>
        </Text>
        {ctx !== null ? (
          <Text>
            <Text color="yellow" bold>▤ CONTEXT </Text>
            <Text color={tone(ctx)}>{bar(ctx)} {Math.round(ctx)}%</Text>
            {s.contextTokens !== null && s.contextWindow !== null ? (
              <Text dimColor> {dots(s.contextTokens)}/{dots(s.contextWindow)}</Text>
            ) : null}
          </Text>
        ) : null}
        {s.limits.map(l => (
          <Text key={l.kind}>
            <Text color="blue" bold>⏱ {label(l.kind)} </Text>
            <Text color={tone(l.percentUsed)}>{bar(l.percentUsed, 6)} {Math.round(l.percentUsed)}%</Text>
            <Text dimColor>{resetLabel(l.resetsAt, now)}</Text>
          </Text>
        ))}
      </Box>
    )

    return below ? (
      <Box flexDirection="column">
        {below}
        {mine}
      </Box>
    ) : (
      mine
    )
  })
}
