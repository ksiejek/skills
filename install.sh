#!/usr/bin/env bash
# Links every active skill of skills.tsv (its source in this repository) into Claude Code, so editing it here or a
# `git pull` here updates it at once. The copies other projects carry are never linked (bin/skills.js writes them).
#   ./install.sh                         all active skills, and drops links to retired or missing skills
#   ./install.sh mendix-docs             only the ones named (nothing is dropped)
#   ./install.sh --check                 says what it would change and changes nothing; exit 1 when something would change
#   ./install.sh --codex [names…]        also for Codex: into ~/.agents/skills (where Codex looks now) and
#                                        $CODEX_HOME/skills, or ~/.codex/skills when CODEX_HOME is not set (older)
# Safe to run again and again: a link that is already right is left alone. A skill folder in ~/.claude/skills (or Codex's
# skills folder) that is not a link is moved to skills-backup/<name>-<date> beside it, never deleted; only links are removed.
# Folders in skills.tsv are relative to the folder holding this repository (~/Projects), or SKILLS_PROJECTS_DIR.
# No dependencies: bash 3.2 and ln.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS="${SKILLS_PROJECTS_DIR:-$(dirname "$HERE")}"
MANIFEST="$HERE/skills.tsv"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
BACKUP="$HOME/.claude/skills-backup"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
CODEX=no
CHECK=no
NAMES=()
for arg in "$@"; do
  case "$arg" in
    --codex) CODEX=yes ;;
    --check) CHECK=yes ;;
    *) NAMES+=("$arg") ;;
  esac
done

# skills.tsv → ACTIVE_NAME/ACTIVE_DIR (the rows to link) and RETIRED_DIR (retired folders and the copies other projects
# carry: a link to one of them is dropped, an active skill's link is pointed at its source)
ACTIVE_NAME=(); ACTIVE_DIR=(); RETIRED_DIR=()
while IFS=$'\t' read -r name status folder note || [ -n "${name:-}" ]; do
  case "$name" in ''|'#'*|name) continue ;; esac
  case "$status" in
    active)  ACTIVE_NAME+=("$name"); ACTIVE_DIR+=("$PROJECTS/$folder") ;;
    retired|copy) RETIRED_DIR+=("$PROJECTS/$folder") ;;
    *) echo "skills.tsv: $name has an unknown status '$status'" >&2; exit 2 ;;
  esac
done < "$MANIFEST"

wanted() {  # wanted <name>: is it one of the names given (or were none given)?
  local n
  [ ${#NAMES[@]} -eq 0 ] && return 0
  for n in "${NAMES[@]}"; do [ "$n" = "$1" ] && return 0; done
  return 1
}
active_dir() {  # active_dir <name>: its source folder, empty when it has no active row
  local i
  for i in "${!ACTIVE_NAME[@]}"; do [ "${ACTIVE_NAME[$i]}" = "$1" ] && { echo "${ACTIVE_DIR[$i]}"; return; }; done
}
is_retired_dir() {
  local d
  for d in ${RETIRED_DIR[@]+"${RETIRED_DIR[@]}"}; do [ "$d" = "$1" ] && return 0; done
  return 1
}

CHANGES=0
act() {  # act <message> <command…>: run it, or with --check only say it
  local msg="$1"; shift
  CHANGES=$((CHANGES + 1))
  if [ "$CHECK" = yes ]; then echo "would $msg"; else "$@"; echo "$msg"; fi
}
move_and_link() {  # move_and_link <backup root> <target> <name> <source>
  mkdir -p "$1"
  mv "$2" "$1/$3-$(date +%Y%m%d-%H%M%S)"
  ln -s "$4" "$2"
}

# link_into <skills folder> <its backup folder>
link_into() {
  local dest="$1" backup="$2" i name src target link to
  [ "$CHECK" = yes ] || mkdir -p "$dest"
  for i in "${!ACTIVE_NAME[@]}"; do
    name="${ACTIVE_NAME[$i]}"; src="${ACTIVE_DIR[$i]}"; target="$dest/$name"
    wanted "$name" || continue
    if [ ! -f "$src/SKILL.md" ]; then echo "skip   $name: no $src/SKILL.md" >&2; continue; fi
    if [ -L "$target" ] && [ "$(readlink "$target")" = "$src" ]; then echo "ok     $name"; continue; fi
    if [ -L "$target" ]; then
      act "relink $target -> $src (was $(readlink "$target"))" ln -sfn "$src" "$target"
    elif [ -e "$target" ]; then
      act "moved the old $name to $backup, linked $target -> $src" move_and_link "$backup" "$target" "$name" "$src"
    else
      act "link   $target -> $src" ln -s "$src" "$target"
    fi
  done
  # Only a full run tidies up: links to a retired folder, into MxCraft, or into ~/Projects at a folder with no SKILL.md.
  [ ${#NAMES[@]} -eq 0 ] || return 0
  [ -d "$dest" ] || return 0
  for link in "$dest"/*; do
    [ -L "$link" ] || continue
    name="$(basename "$link")"; to="$(readlink "$link")"
    [ -n "$(active_dir "$name")" ] && continue  # an active skill's link was set right above
    if is_retired_dir "$to" || case "$to" in "$PROJECTS/MxCraft/"*) true ;; *) false ;; esac; then
      act "remove $link (retired: $to)" rm "$link"
    elif case "$to" in "$PROJECTS/"*) true ;; *) false ;; esac && [ ! -f "$to/SKILL.md" ]; then
      act "remove $link (no skill at $to)" rm "$link"
    fi
  done
}

link_into "$DEST" "$BACKUP"
# Codex looks for a user's skills in ~/.agents/skills now and still reads $CODEX_HOME/skills (marked deprecated in
# its source, 2026-10-15): both, so newer and older Codex versions find them.
if [ "$CODEX" = yes ]; then link_into "$HOME/.agents/skills" "$HOME/.agents/skills-backup"; link_into "$CODEX_DIR/skills" "$CODEX_DIR/skills-backup"; fi
echo
if [ "$CHECK" = yes ]; then
  if [ "$CHANGES" -eq 0 ]; then echo "Up to date: nothing to change."; exit 0; fi
  echo "$CHANGES change(s) waiting. Run without --check to make them."; exit 1
fi
echo "Done ($CHANGES change(s)). Update later with git pull here (the links follow it); restart Claude Code to reload."
