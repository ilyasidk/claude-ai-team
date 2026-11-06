---
name: delegate
description: Delegate a self-contained coding/build task to Codex (OpenAI, ChatGPT.app) or Antigravity (agy, Gemini.app) and use the result like a subagent's. Use when the user says "give it to Codex / Antigravity", "delegate", or when a long routine job (iterate until a checklist passes) is better offloaded.
---

# Delegate to Codex / Antigravity (works like a subagent)

Both are local CLIs (no extra install if the apps are installed):
- **codex** = `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex` (`codex exec`, sandbox workspace-write, uses your OpenAI subscription). Override with `CODEX_BIN`.
- **agy** = `/Applications/Gemini.app/Contents/Helpers/agy` (`agy --print`, Antigravity; needs a one-time Google sign-in: run `agy` in a terminal and sign in yourself). Override with `AGY_BIN`.

## How to call (same as an Agent call)
1. Write a self-contained brief to a file (they do not see this chat): goal, repo path, files/commands, rules, acceptance checklist, what to return.
2. Run it in the background so the session is notified when done (never poll):
   `Bash(run_in_background: true): ~/.claude/skills/delegate/run.sh <codex|agy> <workdir> <task-file> <out-file>`
   Run several at once only if they touch different files. The final answer is printed at the end and stored in `<out-file>`; the full log is `<out-file>.log`.
3. When the notification arrives: READ the result, then VERIFY it yourself (run the checks, open the files). Do not trust the report.
4. Fix or re-delegate with a sharper brief (`codex exec resume --last` continues the same Codex thread).

## Rules
- Never delegate: publishing, paid API calls, credentials, deleting, git push, anything the user must approve. Say so in the brief and re-check.
- The other agent has no memory of the user's preferences: paste the relevant rules into the brief, or edit `PREAMBLE.md` (it is prepended to every task).
- Subagent shortcut: the agent types `codex` and `agy` (in `~/.claude/agents/`) wrap this runner, so you can call `Agent(subagent_type: "codex", prompt: "...")` (available after restarting the session).

## Cheap by default
`run.sh` defaults to Codex `gpt-6.1-terra` with effort low and Antigravity `gemini-3.8-flash-low`. Raise only when needed: `CODEX_EFFORT=medium`, `CODEX_MODEL=..`, `AGY_MODEL=..`, `AGY_EFFORT=..`. Check limits with `usage.sh`.

## Limits widget
Optional mod `limits-widget` (pane "Limits", command `/limits`), see the repo README. A mod cannot read Claude plan limits by itself: after every `get_usage` call the agent can write `~/.claude/limits/claude_snapshot.json` (`at`, `five.used`, `five.resets_at`, `week.used`, `week.resets_at`) as a fallback.
