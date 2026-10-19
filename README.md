# Claude Code mods

Two small mods for [Claude Code](https://claude.com/claude-code) that put the numbers you usually have to go looking for right above the prompt.

| Mod | What it shows | Updates on |
| --- | --- | --- |
| [`token-meter`](./token-meter) | Input and output tokens of the last prompt, plus the running total for the session | every completed turn |
| [`session-stats`](./session-stats) | Active model, effort level, context-window fill, and rate-limit usage with reset times | every model step and usage measurement |

Install one or both. They stack: `session-stats` draws its row under whatever is already above the prompt.

```
╭────────────────────────────────────────────────────────────────────────────────────────╮
│ ◆ TOKENS · PROMPT 12   ↓ 48.213 in   ↑ 1.904 out   │   Σ TOTAL 402.118 in · 18.733 out │
╰────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────╮
│ ◈ MODEL opus-5-5   ✦ EFFORT high   ▤ CONTEXT ████░░░░░░ 41% 82.000/200.000             │
│ ⏱ 5h ███░░░ 47% ↻ Mon 19.10 14:30 (2h05)   ⏱ 7d █░░░░░ 18% ↻ Thu 22.10 09:00 (2d20h)   │
╰────────────────────────────────────────────────────────────────────────────────────────╯
```

*(Illustrative values. Context and rate-limit bars are green below 60%, yellow from 60%, red from 85%. On a narrow terminal the row wraps.)*

## Why

Claude Code already tracks tokens, context and limits, but you have to ask for them (`/context`, `/usage`) and they are gone once you go back to typing. When you are working with a large context or close to a rate limit, a glance at the prompt is faster than a command, and it is easier to notice when a single prompt costs far more than expected.

## Requirements

- Claude Code with the **function hooks** mod API (built against 2.1.289, tested on 2.1.303).
- Works where Claude Code draws the band above the prompt: the terminal and the desktop app's local sessions.
- No dependencies, no build step. The engine loads the TypeScript source directly.

> The function hooks API is **early access** and may change between Claude Code releases. If an update breaks a mod, Claude Code skips it and keeps working. Please open an issue.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install token-meter --marketplace Marco-Sau/claude-code-mods
/plugin install session-stats --marketplace Marco-Sau/claude-code-mods
```

Answer `y` to add the marketplace (the first time only), then choose a scope (user scope is the default and loads the mod in every session). Each mod becomes active in that session right away.

From a shell:

```bash
claude plugin install token-meter --marketplace Marco-Sau/claude-code-mods
claude plugin install session-stats --marketplace Marco-Sau/claude-code-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Marco-Sau/claude-code-mods`, then **Add plugin**.

## Usage

There is nothing to configure or run. Send a prompt.

**token-meter**

- `↓ in`: input tokens of the last prompt, *including* cache reads and cache writes, which is what the model actually processed.
- `↑ out`: output tokens of the last prompt.
- `PROMPT n` and `Σ TOTAL`: the number of prompts and the summed input and output since the session started.
- The band appears after the first completed turn.

**session-stats**

- `MODEL`: the model that answered the last step, without the `claude-` prefix.
- `EFFORT`: the effort level of the last step, or `default` when none was set.
- `CONTEXT`: how full the context window is, as a bar, a percentage, and tokens used over window size.
- `⏱ 5h` / `⏱ 7d`: rate-limit windows that Claude Code reports, with percent used and when each resets (local time and time left). These appear only when Claude Code reports rate limits for your account.

Both bands step aside while a survey is shown above the prompt.

## What the mods can access

Both mods are a single TypeScript module each, which you can read in full in [`token-meter/hooks/register.tsx`](./token-meter/hooks/register.tsx) and [`session-stats/hooks/register.tsx`](./session-stats/hooks/register.tsx).

| | token-meter | session-stats |
| --- | --- | --- |
| Events it listens to | `turn.complete` | `turn.step`, `session.measure` |
| What it draws | `AbovePrompt` band | `AbovePrompt` band |
| Engine calls | session state, UI elements | session state, UI elements, clock |
| Files, shell, network, other tools | none | none |
| Data kept | counters for the current session only | last model, effort, context and limits for the current session only |

Mod code runs in Claude Code's sandboxed hooks environment, with no Node, filesystem or network access of its own. `claude plugin validate` reports exactly the hooks and calls listed above.

## Update and uninstall

```bash
claude plugin update token-meter@marcosau-mods
claude plugin update session-stats@marcosau-mods

claude plugin uninstall token-meter@marcosau-mods
claude plugin uninstall session-stats@marcosau-mods
```

Updates apply after a restart (or `/reload-plugins`).

## Known limitations

- **Main conversation only.** Subagent turns are excluded from `token-meter` and do not change the model shown in `session-stats`.
- **Per session.** Totals reset when a new session starts. They are not stored across sessions.
- **Input includes cache.** `↓ in` counts cache reads and cache writes together with fresh input. It reflects context size per prompt, not billed cost.
- **Number format.** Thousands are separated with a dot (`48.213`), the European convention.
- **Rate limits depend on your account.** They show only when Claude Code reports them; sessions that report none (for example some API-key setups) show no limit rows.
- **Early-access API.** See Requirements.

## Development

Each mod is a folder with `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, a state contract in `types/index.d.ts`, and tests in `tests/`.

```bash
claude plugin validate ./token-meter      # manifest, hooks and state contract
claude plugin test ./token-meter          # runs tests/*.test.tsx against the engine
claude --plugin-dir ./token-meter         # try a local copy in one session
```

The tests cover the terminal and desktop surfaces.

## License

[MIT](./LICENSE) © 2026 Marco Sau, [marcosau.com](https://marcosau.com)
