#!/usr/bin/env bash
# Links the skills in this repository into Claude Code, so `git pull` here updates them at once.
#   ./install.sh                         all skills
#   ./install.sh mendix-docs             only the ones named
#   ./install.sh --codex [names…]        also into Codex's skills folder, for newer Codex versions that load
#                                        skills: $CODEX_HOME/skills, or ~/.codex/skills when CODEX_HOME is not set
# A skill folder already in ~/.claude/skills (or Codex's skills folder) that is not a link is moved to
# skills-backup/<name>-<date> beside it, never deleted. No dependencies: bash and ln.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
BACKUP="$HOME/.claude/skills-backup"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
ALL=(mendix-describe mendix-assist mendix-docs app-report-presentation)
CODEX=no
NAMES=()
for arg in "$@"; do
  if [ "$arg" = "--codex" ]; then CODEX=yes; else NAMES+=("$arg"); fi
done
if [ ${#NAMES[@]} -eq 0 ]; then NAMES=("${ALL[@]}"); fi

# link_into <skills folder> <its backup folder>
link_into() {
  local dest="$1" backup="$2" old name src target moved
  mkdir -p "$dest"
  # mendix-ticket-check was replaced by mendix-assist (2026-10-15): drop its link if it points here.
  old="$dest/mendix-ticket-check"
  if [ -L "$old" ] && [ "$(readlink "$old")" = "$HERE/mendix-ticket-check" ]; then rm "$old"; echo "removed the old link $old (now mendix-assist)"; fi
  for name in "${NAMES[@]}"; do
    src="$HERE/$name"
    if [ ! -f "$src/SKILL.md" ]; then echo "skip $name: no $src/SKILL.md" >&2; continue; fi
    target="$dest/$name"
    if [ -L "$target" ]; then
      rm "$target"
    elif [ -e "$target" ]; then
      mkdir -p "$backup"
      moved="$backup/$name-$(date +%Y%m%d-%H%M%S)"
      mv "$target" "$moved"
      echo "moved the old $name to $moved"
    fi
    ln -s "$src" "$target"
    echo "linked $target -> $src"
  done
}

link_into "$DEST" "$BACKUP"
if [ "$CODEX" = yes ]; then link_into "$CODEX_DIR/skills" "$CODEX_DIR/skills-backup"; fi
echo
if [ "$CODEX" = yes ]; then
  echo "Done. Update later with: git -C \"$HERE\" pull   (the links follow it; restart Claude Code and Codex to reload)."
else
  echo "Done. Update later with: git -C \"$HERE\" pull   (the links follow it; restart Claude Code to reload)."
fi
