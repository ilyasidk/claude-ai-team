#!/bin/bash
# delegate/run.sh - run Codex (OpenAI, inside ChatGPT.app) or Antigravity (agy, inside Gemini.app) on a task file, like a subagent.
# usage: [CODEX_EFFORT=low|medium|high] [CODEX_MODEL=..] [AGY_MODEL=gemini-3.8-flash-low|claude-sonnet-4-6|..] [AGY_EFFORT=..] run.sh <codex|agy> <workdir> <task-file> [out-file]
# defaults are CHEAP: codex gpt-6.1-terra effort low, agy gemini-3.8-flash-low. Raise only for hard tasks.
# prints the other agent's FINAL answer (out-file) at the end; full log in <out-file>.log
who="$1"; dir="$2"; task="$3"; out="${4:-/tmp/delegate_${1}_$(date +%s).out}"
CODEX="${CODEX_BIN:-/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex}"
AGY="${AGY_BIN:-/Applications/Gemini.app/Contents/Helpers/agy}"
[ -f "$task" ] || { echo "no task file: $task"; exit 2; }
PRE="$(dirname "$0")/PREAMBLE.md"
full="/tmp/delegate_full_$$.md"
cat "$PRE" "$task" > "$full"; task="$full"   # every delegated task starts with the shared rules (PREAMBLE.md)
[ -d "$dir" ] || { echo "no workdir: $dir"; exit 2; }
case "$who" in
  codex) "$CODEX" exec -C "$dir" --sandbox workspace-write --skip-git-repo-check -c "model_reasoning_effort=\"${CODEX_EFFORT:-low}\"" -m "${CODEX_MODEL:-gpt-6.1-terra}" -o "$out" - < "$task" > "$out.log" 2>&1; rc=$? ;;
  agy)   ( cd "$dir" && "$AGY" --sandbox --dangerously-skip-permissions --model "${AGY_MODEL:-gemini-3.8-flash-low}" ${AGY_EFFORT:+--effort "$AGY_EFFORT"} --output-format text --print="$(cat "$task")" > "$out" 2> "$out.log" ); rc=$? ;;
  *) echo "who must be codex or agy"; exit 2 ;;
esac
echo "DONE who=$who exit=$rc out=$out log=$out.log"
echo "----- FINAL ANSWER (last 4000 chars) -----"
tail -c 4000 "$out"
