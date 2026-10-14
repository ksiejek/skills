#!/usr/bin/env bash
# Links the skills in this repository into Claude Code, so `git pull` here updates them at once.
#   ./install.sh                 all skills
#   ./install.sh mendix-docs     only the ones named
# A skill folder already in ~/.claude/skills that is not a link here is moved to
# ~/.claude/skills-backup/<name>-<date>, never deleted. No dependencies: bash and ln.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
BACKUP="$HOME/.claude/skills-backup"
ALL=(mendix-describe mendix-ticket-check mendix-docs app-report-presentation)
NAMES=("${@:-${ALL[@]}}")

mkdir -p "$DEST"
for name in "${NAMES[@]}"; do
  src="$HERE/$name"
  if [ ! -f "$src/SKILL.md" ]; then echo "skip $name: no $src/SKILL.md" >&2; continue; fi
  target="$DEST/$name"
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    mkdir -p "$BACKUP"
    moved="$BACKUP/$name-$(date +%Y%m%d-%H%M%S)"
    mv "$target" "$moved"
    echo "moved the old $name to $moved"
  fi
  ln -s "$src" "$target"
  echo "linked $target -> $src"
done
echo
echo "Done. Update later with: git -C \"$HERE\" pull   (the links follow it; restart Claude Code to reload)."
