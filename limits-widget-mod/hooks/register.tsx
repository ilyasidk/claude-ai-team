import type { Register } from 'claude-code'

const PANE = 'limits'
const SCRIPT = '__HOME__/.claude/limits/usage_json.py' // install.sh replaces __HOME
const PERIOD = 15007
const data = { plugin: 'limits-widget', key: 'data' } as const
const act = { plugin: 'limits-widget', key: 'act' } as const

const GREEN = '#4cc38a'
const YELLOW = '#f5c542'
const RED = '#ef5b5b'
const BLUE = '#6ea8fe'

function tone(used: number): string {
  return used >= 85 ? RED : used >= 60 ? YELLOW : GREEN
}

function bar(used: number, width = 20): string {
  const n = Math.max(0, Math.min(width, Math.round((used / 100) * width)))
  return '▰'.repeat(n) + '▱'.repeat(width - n)
}

function ago(sec: number): string {
  const m = Math.max(0, Math.round(sec / 60))
  return m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : `${Math.floor(m / 60)} ч ${m % 60} мин назад`
}

function left(epochSec: number, now: number): string {
  const m = Math.max(0, Math.round((epochSec - now) / 60))
  if (m >= 1440) return `${Math.floor(m / 1440)} д ${Math.floor((m % 1440) / 60)} ч`
  return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`
}


function svg(kind: 'claude' | 'codex' | 'gemini', working: boolean): string {
  const bob = working
    ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.7s" repeatCount="indefinite"/>'
    : ''
  const dots = working
    ? '<circle cx="20" cy="52" r="2" fill="#9aa4b2"><animate attributeName="opacity" values="1;0.2;1" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="28" cy="52" r="2" fill="#9aa4b2"><animate attributeName="opacity" values="0.2;1;0.2" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="36" cy="52" r="2" fill="#9aa4b2"><animate attributeName="opacity" values="1;0.2;1" dur="0.9s" begin="0.3s" repeatCount="indefinite"/></circle>'
    : '<text x="38" y="14" font-size="11" fill="#9aa4b2" font-family="sans-serif" font-weight="bold">z<animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite"/></text><text x="45" y="8" font-size="8" fill="#9aa4b2" font-family="sans-serif" font-weight="bold">z</text>'
  const eyes = (cx1: number, cx2: number, y: number, c: string) =>
    working
      ? `<circle cx="${cx1}" cy="${y}" r="3.2" fill="${c}"><animate attributeName="ry" values="3.2;0.4;3.2" dur="3s" repeatCount="indefinite"/></circle><circle cx="${cx2}" cy="${y}" r="3.2" fill="${c}"/>`
      : `<path d="M${cx1 - 3.5} ${y} q3.5 3 7 0" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M${cx2 - 3.5} ${y} q3.5 3 7 0" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`
  let body = ''
  if (kind === 'claude') {
    body = `<g>${bob}<rect x="8" y="14" width="40" height="32" rx="13" fill="#d97757" stroke="#8a3f26" stroke-width="2"/><path d="M28 6 l1.6 4.6 4.6 1.6 -4.6 1.6 -1.6 4.6 -1.6 -4.6 -4.6 -1.6 4.6 -1.6z" fill="#f4b393"/>${eyes(21, 35, 30, '#3a1f14')}<path d="M24 38 q4 3 8 0" stroke="#3a1f14" stroke-width="2" fill="none" stroke-linecap="round"/></g>`
  } else if (kind === 'codex') {
    body = `<g>${bob}<rect x="7" y="13" width="42" height="34" rx="10" fill="#1f2937" stroke="#10a37f" stroke-width="2.5"/><rect x="12" y="19" width="32" height="20" rx="5" fill="#0b1220"/><text x="16" y="34" font-size="13" fill="#10a37f" font-family="monospace" font-weight="bold">&gt;_${working ? '<animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite"/>' : ''}</text><rect x="4" y="25" width="4" height="10" rx="2" fill="#10a37f"/><rect x="48" y="25" width="4" height="10" rx="2" fill="#10a37f"/><path d="M28 13 v-6" stroke="#10a37f" stroke-width="2"/><circle cx="28" cy="6" r="2.5" fill="#10a37f"/></g>`
  } else {
    body = `<g>${bob}<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="#b57bff"/></linearGradient></defs><path d="M28 5 C31 20 36 25 51 28 C36 31 31 36 28 51 C25 36 20 31 5 28 C20 25 25 20 28 5Z" fill="url(#g)" stroke="#4a5bd6" stroke-width="2" stroke-linejoin="round">${working ? '<animateTransform attributeName="transform" type="rotate" values="-6 28 28;6 28 28;-6 28 28" dur="1.6s" repeatCount="indefinite"/>' : ''}</path>${eyes(23, 33, 28, '#1b1f4a')}<path d="M25 34 q3 2.5 6 0" stroke="#1b1f4a" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 58" width="56" height="58">${body}${dots}</svg>`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'limits', description: 'Pane: usage limits of Claude, Codex, Antigravity' })
    void $.ui.open({ id: PANE, title: 'Лимиты' })
    $.clock.every(PERIOD, () => {})
    try {
      const u = await $.session.usage()
      const r = await $.process.run(['python3', SCRIPT], { timeoutMs: 90000 })
      if (r.exitCode === 0 && r.stdout.trim().startsWith('{')) {
        await $.state.set(data, { raw: r.stdout.trim(), at: Date.now(), claude: u.rateLimits ?? [] })
      }
    } catch {
      // keep the last numbers
    }
    return next(e)
  })

  on('clock.every', async ($, e, next) => {
    const ran = await next(e)
    if (e.ms === PERIOD) {
      try {
        const u = await $.session.usage()
        const r = await $.process.run(['python3', SCRIPT], { timeoutMs: 90000 })
        if (r.exitCode === 0 && r.stdout.trim().startsWith('{')) {
          await $.state.set(data, { raw: r.stdout.trim(), at: Date.now(), claude: u.rateLimits ?? [] })
        }
      } catch {
        // keep the last numbers
      }
    }
    return ran
  })

  on('command.run', { command: 'limits' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Лимиты' })
    try {
      const u = await $.session.usage()
      const r = await $.process.run(['python3', SCRIPT], { timeoutMs: 90000 })
      if (r.exitCode === 0 && r.stdout.trim().startsWith('{')) {
        await $.state.set(data, { raw: r.stdout.trim(), at: Date.now(), claude: u.rateLimits ?? [] })
      }
    } catch {
      // keep the last numbers
    }
    return { text: 'Панель «Лимиты» открыта.' }
  })

  on('tool.call', async ($, e, next) => {
    try {
      const inp: any = (e as any).input ?? {}
      const detail = String(inp.description ?? inp.command ?? inp.file_path ?? inp.pattern ?? inp.prompt ?? '').replace(/\s+/g, ' ').slice(0, 60)
      await $.state.set(act, { tool: String((e as any).tool ?? ''), detail, at: Date.now() })
    } catch {
      // never block a tool call
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Svg } = $.ui.resolve(e)
    const { value: held } = await $.state.get(data)
    const { value: lastAct } = await $.state.get(act)
    if (!held) return <Text dimColor>Загружаю лимиты…</Text>
    let d: any
    try {
      d = JSON.parse(held.raw)
    } catch {
      return <Text color={RED}>Не смог прочитать данные.</Text>
    }
    const now: number = d.now
    const line = (label: string, used: number, tail: string) => (
      <Box flexDirection="row" gap={1}>
        <Text dimColor>{label.padEnd(8)}</Text>
        <Text color={tone(used)}>{bar(used)}</Text>
        <Text bold color={tone(used)}>{String(Math.round(used)).padStart(3)}%</Text>
        <Text dimColor>{tail}</Text>
      </Box>
    )
    const card = (title: string, sub: string, accent: string, rows: any[]) => (
      <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={1} marginBottom={1}>
        <Box flexDirection="row" gap={1}>
          <Text bold color={accent}>{title}</Text>
          <Text dimColor>{sub}</Text>
        </Box>
        {rows}
      </Box>
    )
    const cards: any[] = []

    // Claude: live from this session (no tokens), snapshot only as a fallback
    const live: any[] = held.claude ?? []
    const five = live.find(x => x.kind === 'five_hour')
    const week = live.find(x => x.kind === 'seven_day')
    const snap = d.claude
    const cRows: any[] = []
    if (five) cRows.push(line('5 часов', five.percentUsed, five.resetsAt ? 'сброс через ' + left(Date.parse(five.resetsAt) / 1000, now) : ''))
    else if (snap?.five) cRows.push(line('5 часов', snap.five.used, 'сброс через ' + left(Date.parse(snap.five.resets_at) / 1000, now)))
    if (week) cRows.push(line('Неделя', week.percentUsed, week.resetsAt ? 'сброс через ' + left(Date.parse(week.resetsAt) / 1000, now) : ''))
    else if (snap?.week) cRows.push(line('Неделя', snap.week.used, 'сброс через ' + left(Date.parse(snap.week.resets_at) / 1000, now)))
    if (cRows.length) cards.push(card('Claude', 'Max', BLUE, cRows))

    if (d.codex) {
      const rows: any[] = []
      if (d.codex.primary) rows.push(line('5 часов', d.codex.primary.used, 'сброс через ' + left(d.codex.primary.resets_at, now)))
      if (d.codex.secondary) rows.push(line('Неделя', d.codex.secondary.used, 'сброс через ' + left(d.codex.secondary.resets_at, now)))
      cards.push(card('Codex', 'ChatGPT', GREEN, rows))
    }
    if (d.agy) {
      const rows: any[] = []
      for (const k of Object.keys(d.agy)) {
        const used = 100 - d.agy[k].left
        rows.push(line(k.startsWith('Gemini') ? 'Gemini' : 'Cl + GPT', used, `осталось ${d.agy[k].left}% · до ${String(d.agy[k].resets_at).slice(5, 10)}`))
      }
      cards.push(card('Antigravity', 'Google', '#c58af9', rows))
    }
    const team = d.team ?? {}
    const claudeWorking = !!lastAct && Date.now() - lastAct.at < 60000
    const member = (kind: 'claude' | 'codex' | 'gemini', name: string, working: boolean, what: string, accent: string) => (
      <Box flexDirection="row" gap={1} alignItems="center">
        <Svg source={svg(kind, working)} alt={name} width={56} height={58} isInteractive />
        <Box flexDirection="column">
          <Text bold color={accent}>{name}</Text>
          <Text color={working ? GREEN : undefined} dimColor={!working}>{working ? '● работает' : '○ отдыхает'}</Text>
          <Text dimColor>{working ? what || '…' : 'ждёт задачу'}</Text>
        </Box>
      </Box>
    )
    const crew = (
      <Box flexDirection="column" borderStyle="round" borderColor="#8b95a7" paddingX={1}>
        <Text bold>Команда</Text>
        {member('claude', 'Claude', claudeWorking, lastAct ? `${lastAct.tool}${lastAct.detail ? ': ' + lastAct.detail : ''}` : '', BLUE)}
        {member('codex', 'Codex', !!team.codex?.working, team.codex?.what ?? '', GREEN)}
        {member('gemini', 'Gemini', !!team.gemini?.working, team.gemini?.what ?? '', '#c58af9')}
      </Box>
    )
    return (
      <Box flexDirection="column">
        {cards}
        {crew}
      </Box>
    )
  })
}
