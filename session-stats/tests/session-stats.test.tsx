import { test, expect, mock } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 160, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('shows model, effort, context fill and rate limits once a turn has run', async ($, on) => {
  // what sits beneath the mod in a session: the engine's own band, step and measure
  on('ui.render', async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('session.measure', async () => ({ changed: [] }))
  const clock = mock.clock(on, { now: Date.parse('2026-10-19T10:00:00Z') })

  for (const surface of ['terminal', 'desktop'] as const) {
    const empty = await $.ui.mount({ plugin: 'session-stats', surface, ...BAND })
    expect(await empty.find({ text: /MODEL/ })).toBeUndefined()
    await empty.unmount()
  }

  const step = $.turn.step({ turnId: 't1', index: 0, model: 'claude-test-model', effort: 'high', messageCount: 1 })
  for await (const _ of step) {
    // drain the stream
  }

  await $.session.measure({
    context: { tokens: 90000, window: 200000, percent: 45 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 90, resetsAt: '2026-10-19T12:30:00Z' }],
    changed: ['context', 'rateLimits'],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-stats', surface, ...BAND })
    expect(await ui.find({ text: /^test-model$/ })).toBeDefined()
    expect(await ui.find({ text: /^high$/ })).toBeDefined()
    expect(await ui.find({ text: /45%/ })).toBeDefined()
    expect(await ui.find({ text: /90\.000\/200\.000/ })).toBeDefined()
    expect(await ui.find({ text: /5h/ })).toBeDefined()
    expect(await ui.find({ text: /\(2h30\)/ })).toBeDefined()
    await ui.unmount()
  }
  void clock
})
