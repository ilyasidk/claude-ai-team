#!/bin/bash
# usage.sh - limits of Codex and Antigravity (Claude's own limits: ask the agent to call get_usage / see the app's usage card)
echo "== CODEX (ChatGPT subscription)"
f=$(find ~/.codex/sessions -name "rollout-*.jsonl" -type f -print0 | xargs -0 ls -t | head -1)
python3 - "$f" <<'PY'
import sys, json, time
last = None
for line in open(sys.argv[1]):
    if '"rate_limits"' in line:
        try:
            d = json.loads(line)
        except Exception:
            continue
        def find(o):
            if isinstance(o, dict):
                if 'rate_limits' in o: return o['rate_limits']
                for v in o.values():
                    r = find(v)
                    if r: return r
            elif isinstance(o, list):
                for v in o:
                    r = find(v)
                    if r: return r
        r = find(d)
        if r: last = r
if not last: print('no data yet (run Codex once)'); sys.exit()
for k, lab in (('primary', '5-hour'), ('secondary', 'weekly')):
    w = last.get(k)
    if w:
        left = max(0, w['resets_at'] - time.time())
        print('  %-7s used %4.1f%%  resets in %dh %02dm' % (lab, w['used_percent'], left // 3600, left % 3600 // 60))
PY
echo "== ANTIGRAVITY (Google)"
cd /tmp && "${AGY_BIN:-/Applications/Gemini.app/Contents/Helpers/agy}" --output-format text --print="/usage" 2>&1 | sed 's/^/  /'
