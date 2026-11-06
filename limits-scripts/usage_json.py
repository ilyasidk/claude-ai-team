#!/usr/bin/env python3
"""usage_json.py - one JSON with the limits of Claude (snapshot written by the agent), Codex (from its session logs) and Antigravity (agy /usage, cached 10 min)."""
import json, os, re, subprocess, sys, time, glob

H = os.path.expanduser('~')
out = {'now': int(time.time())}

# Claude: the agent saves a snapshot after each get_usage call (a mod cannot read plan limits itself)
try:
    out['claude'] = json.load(open(H + '/.claude/limits/claude_snapshot.json'))
except Exception:
    out['claude'] = None

# Codex: rate limits + what it is doing now (tail of the newest rollout only: cheap)
def _tail(path, n=300000):
    with open(path, 'rb') as f:
        f.seek(0, 2)
        size = f.tell()
        f.seek(max(0, size - n))
        return f.read().decode('utf8', 'ignore').splitlines()

try:
    files = sorted(glob.glob(H + '/.codex/sessions/**/rollout-*.jsonl', recursive=True), key=os.path.getmtime, reverse=True)[:4]
    last = None
    what = ''
    newest_age = None
    for fi, f in enumerate(files):
        lines = _tail(f)
        if fi == 0:
            newest_age = time.time() - os.path.getmtime(f)
            for line in reversed(lines):
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                pl = d.get('payload', d)
                t = pl.get('type', '')
                if t in ('function_call', 'local_shell_call', 'exec_command_begin', 'custom_tool_call'):
                    inp = pl.get('input') or pl.get('arguments') or pl.get('command') or ''
                    if isinstance(inp, (list, dict)):
                        inp = json.dumps(inp, ensure_ascii=False)
                    inp = str(inp)
                    m = re.search(r'"cmd"\s*:\s*"([^"]{3,140})', inp) or re.search(r'cmd[\'"]?\s*[:=]\s*[\'"`]([^\'"`]{3,140})', inp)
                    body = (m.group(1) if m else inp).strip().replace('\\n', ' ').replace('\n', ' ')
                    low = body.lower()
                    if 'apply_patch' in low or 'applypatch' in low or '*** begin patch' in low:
                        what = 'правит файлы'
                    elif 'write_stdin' in low:
                        what = 'ждёт вывод команды'
                    elif 'view_image' in low or 'screenshot' in low:
                        what = 'смотрит картинку'
                    else:
                        what = 'запускает: ' + re.sub(r'^(const|let|var)\s+\w+\s*=\s*(await\s+)?(tools\.)?', '', body)[:60]
                    break
                if t == 'reasoning':
                    what = 'думает над задачей'
                    break
                if t in ('agent_message', 'message') and pl.get('role', 'assistant') == 'assistant':
                    txt = pl.get('message') or ''
                    if not txt and isinstance(pl.get('content'), list):
                        txt = ' '.join(c.get('text', '') for c in pl['content'] if isinstance(c, dict))
                    if txt:
                        what = 'пишет: ' + txt.strip().replace('\n', ' ')[:70]
                        break
        for line in reversed(lines):
            if '"rate_limits"' in line:
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                def find(o):
                    if isinstance(o, dict):
                        if o.get('rate_limits'):
                            return o['rate_limits']
                        for v in o.values():
                            r = find(v)
                            if r:
                                return r
                    elif isinstance(o, list):
                        for v in o:
                            r = find(v)
                            if r:
                                return r
                r = find(d)
                if r:
                    last = r
                    break
        if last:
            break
    if last:
        out['codex'] = {k: {'used': last[k]['used_percent'], 'resets_at': last[k]['resets_at']} for k in ('primary', 'secondary') if last.get(k)}
    out['codex_act'] = {'what': what, 'age': newest_age}
except Exception:
    out['codex'] = None

# who is running right now (processes only, no tokens)
def _ps():
    try:
        return subprocess.run(['ps', '-axo', 'pid=,etime=,command='], capture_output=True, text=True, timeout=10).stdout.splitlines()
    except Exception:
        return []

team = {'codex': {'working': False, 'what': ''}, 'gemini': {'working': False, 'what': ''}}
for line in _ps():
    if re.search(r'MacOS/codex exec ', line) or 'delegate/run.sh codex' in line:
        team['codex']['working'] = True
    if 'Helpers/agy' in line and '--print=' in line and '/usage' not in line:
        team['gemini']['working'] = True
        prompt = line.split('--print=', 1)[1]
        if 'QA-контролёр' in prompt or 'коллаж' in prompt:
            team['gemini']['what'] = 'проверяет кадры ролика'
        else:
            m = re.search(r'# (?:ЗАДАЧА|TASK)\s*(.{10,90})', prompt, re.S)
            team['gemini']['what'] = 'задача: ' + ((m.group(1) if m else prompt[:80]).replace('\n', ' ').strip())
ca = out.get('codex_act') or {}
if not team['codex']['working'] and ca.get('age') is not None and ca['age'] < 25:
    team['codex']['working'] = True
team['codex']['what'] = ca.get('what', '') if team['codex']['working'] else ''
out['team'] = team

# Antigravity: agy /usage, cached
cache = H + '/.claude/limits/agy_cache.json'
try:
    c = json.load(open(cache))
    if time.time() - c['at'] < 600:
        out['agy'] = c['data']
    else:
        raise KeyError
except Exception:
    try:
        r = subprocess.run([os.environ.get('AGY_BIN', '/Applications/Gemini.app/Contents/Helpers/agy'), '--output-format', 'text', '--print=/usage'], capture_output=True, text=True, timeout=60, cwd='/tmp')
        data = {}
        for line in r.stdout.splitlines():
            m = re.match(r'(.+?)\s+Weekly Limit Remaining\s+(\d+)%\s+(\S+)', line.strip())
            if m:
                data[m.group(1).strip()] = {'left': int(m.group(2)), 'resets_at': m.group(3)}
        out['agy'] = data or None
        if data:
            json.dump({'at': time.time(), 'data': data}, open(cache, 'w'))
    except Exception:
        out['agy'] = None
print(json.dumps(out))
