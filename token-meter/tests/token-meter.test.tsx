import { test, expect } from 'claude-code/testing'

const usage = (input: number, output: number) => ({
  model: 'claude-test',
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
})

const turn = (id: string, input: number, output: number) => ({
  answer: 'ok',
  durationMs: 1,
  isAborted: false,
  turnId: id,
  reason: 'answer' as const,
  usage: usage(input, output),
})

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120, scroll: { offset: 0, bodyRows: 20 }, view: {} } } as const

test('shows nothing before the first turn, then per-turn and running totals', async ($, on) => {
  // the engine's own band, beneath the mod: an empty box
  on('ui.render', async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('turn.complete', async (_$, e) => ({ text: e.answer }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const empty = await $.ui.mount({ plugin: 'token-meter', surface, ...BAND })
    expect(await empty.find({ text: /TOKENS/ })).toBeUndefined()
    await empty.unmount()
  }

  await $.turn.complete(turn('t1', 1200, 300))
  await $.turn.complete(turn('t2', 1000, 50))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'token-meter', surface, ...BAND })
    expect(await ui.find({ text: /PROMPT 2/ })).toBeDefined()
    expect(await ui.find({ text: /↓ 1\.000/ })).toBeDefined()
    expect(await ui.find({ text: /2\.200/ })).toBeDefined()
    await ui.unmount()
  }
})

test('keeps what other mods draw above the prompt', async ($, on) => {
  on('ui.render', async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>OTHER BAND</Text>
      </Box>
    )
  })
  on('turn.complete', async (_$, e) => ({ text: e.answer }))

  await $.turn.complete(turn('t1', 10, 5))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'token-meter', surface, ...BAND })
    expect(await ui.find({ text: /OTHER BAND/ })).toBeDefined()
    expect(await ui.find({ text: /PROMPT 1/ })).toBeDefined()
    await ui.unmount()
  }
})
