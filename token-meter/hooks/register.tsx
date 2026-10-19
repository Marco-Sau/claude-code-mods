import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Count } from '../types'

const last = atom({ plugin: 'token-meter', key: 'last' } as const, null)
const total = atom({ plugin: 'token-meter', key: 'total' } as const, { input: 0, output: 0, prompts: 0 })

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const u = e.usage

    if (u && !e.agentId) {
      const turn: Count = {
        input: u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens,
        output: u.output_tokens,
      }
      await update($, last, () => turn)
      await update($, total, t => ({ input: t.input + turn.input, output: t.output + turn.output, prompts: t.prompts + 1 }))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null) {
      return below
    }

    const sum = await read($, total)
    const { Box, Text } = $.ui.resolve(e)

    const mine = (
      <Box borderStyle="round" borderColor="magenta" paddingX={1} gap={2}>
        <Text color="magenta" bold>
          ◆ TOKENS · PROMPT {sum.prompts}
        </Text>
        <Text>
          <Text color="cyan" bold>↓ {fmt(turn.input)}</Text>
          <Text dimColor> in   </Text>
          <Text color="green" bold>↑ {fmt(turn.output)}</Text>
          <Text dimColor> out</Text>
        </Text>
        <Text dimColor>│</Text>
        <Text>
          <Text color="yellow" bold>Σ TOTAL </Text>
          <Text color="cyan">{fmt(sum.input)}</Text>
          <Text dimColor> in · </Text>
          <Text color="green">{fmt(sum.output)}</Text>
          <Text dimColor> out</Text>
        </Text>
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
