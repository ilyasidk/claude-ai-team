#!/bin/bash
# install.sh - copy the skill, agents, limits script and widget mod into ~/.claude
set -e
here="$(cd "$(dirname "$0")" && pwd)"
C="$HOME/.claude"
mkdir -p "$C/skills" "$C/agents" "$C/limits"
cp -R "$here/skills/delegate" "$C/skills/"
cp "$here/agents/"*.md "$C/agents/"
cp "$here/limits-scripts/usage_json.py" "$C/limits/"
rm -rf "$C/limits/limits-widget-mod"
cp -R "$here/limits-widget-mod" "$C/limits/limits-widget-mod"
sed -i.bak "s#__HOME__#$HOME#" "$C/limits/limits-widget-mod/hooks/register.tsx" && rm -f "$C/limits/limits-widget-mod/hooks/register.tsx.bak"
chmod +x "$C/skills/delegate/run.sh" "$C/skills/delegate/usage.sh"
echo "Installed to $C"
echo "Widget mod folder: $C/limits/limits-widget-mod  (load it as a Claude mod, see README)"
echo "Restart your Claude session to pick up the 'codex' and 'agy' agent types."
