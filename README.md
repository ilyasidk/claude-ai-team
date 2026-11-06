# claude-ai-team

A small mod kit that lets **Claude Code** work as a lead and delegate routine jobs to **Codex** (OpenAI, ChatGPT.app) and **Antigravity / `agy`** (Google, Gemini.app) as if they were subagents — plus a live **limits pane** showing usage for all three.

macOS, local CLIs, your own subscriptions. Nothing is sent anywhere except by those tools themselves.

## What is inside

| Path | What it does |
|---|---|
| `skills/delegate/` | Skill + `run.sh` (runs `codex exec` or `agy --print` on a task file) + `usage.sh` (limits) + `PREAMBLE.md` (rules prepended to every task) |
| `agents/codex.md`, `agents/agy.md` | Thin subagent types, so you can call `Agent(subagent_type: "codex", ...)` |
| `limits-scripts/usage_json.py` | One JSON with limits of Claude (optional snapshot), Codex (from its session logs), Antigravity (`agy /usage`, cached 10 min) and who is working now |
| `limits-widget-mod/` | Claude mod: a pane (`/limits`) with progress bars and a small "team" panel. UI text is in Russian — edit `hooks/register.tsx` to translate |

## Install

```bash
git clone https://github.com/ilyasidk/claude-ai-team.git
cd claude-ai-team
./install.sh
```

Then restart your Claude session. Sign in to `agy` once by running `agy` in a terminal.

## Use

```bash
~/.claude/skills/delegate/run.sh codex /path/to/project task.md out.txt
~/.claude/skills/delegate/run.sh agy   /path/to/project task.md out.txt
```

Defaults are cheap: Codex `gpt-6.1-terra` with effort `low`, `agy` with `gemini-3.8-flash-low`. Change with `CODEX_MODEL`, `CODEX_EFFORT`, `AGY_MODEL`, `AGY_EFFORT`. If the apps live elsewhere, set `CODEX_BIN` / `AGY_BIN`.

Edit `skills/delegate/PREAMBLE.md` to put your own rules in front of every delegated task.

## Rules built in

Delegated agents are told never to publish, run paid APIs, touch keys, commit/push or delete. Claude must read and verify every result itself.

## Notes

- Claude plan limits cannot be read by a mod directly; the pane uses the live session usage when available and `~/.claude/limits/claude_snapshot.json` as a fallback.
- Not tested on Linux/Windows.

## License

MIT
