#!/usr/bin/env bash
# Brings the skills in this repository up to date with MxScout, then checks mendix-docs.
#   ./sync.sh                      (~/Projects/MxScout and ~/Projects/MxScout-Dev)
#   MXSCOUT_DIR=/path/to/MxScout MXSCOUT_DEV_DIR=/path/to/MxScout-Dev ./sync.sh
#
# - mendix-describe/  is refreshed from MxScout Dev's skills/mendix-describe (its canonical home:
#                     the public MxScout's copy without risk triage);
# - mendix-docs/      is re-packed from mendix-docs-source/ with MxScout's engine and
#                     mendix-describe's checker and references;
# - the mendix-docs selftest runs on MxScout's own test fixture.
# No dependencies: bash, cp and Node 18 or later.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MXSCOUT_DIR="${MXSCOUT_DIR:-$HOME/Projects/MxScout}"
MXSCOUT_DEV_DIR="${MXSCOUT_DEV_DIR:-$HOME/Projects/MxScout-Dev}"
DESCRIBE_SRC="$MXSCOUT_DEV_DIR/skills/mendix-describe"

if [ ! -f "$MXSCOUT_DIR/public/docs-file.js" ]; then
  echo "No MxScout repository at $MXSCOUT_DIR - set MXSCOUT_DIR." >&2
  exit 1
fi
if [ ! -f "$DESCRIBE_SRC/SKILL.md" ]; then
  echo "No MxScout Dev repository at $MXSCOUT_DEV_DIR - set MXSCOUT_DEV_DIR." >&2
  exit 1
fi

echo "mendix-describe <- $DESCRIBE_SRC"
cp -R "$DESCRIBE_SRC/." "$HERE/mendix-describe/"
# A file removed upstream is reported, not deleted here: decide by hand.
( cd "$HERE/mendix-describe" && find . -type f ! -name .DS_Store ) | while read -r f; do
  [ -e "$DESCRIBE_SRC/$f" ] || echo "  note: mendix-describe/$f is no longer in MxScout Dev"
done

TICKET_SRC="$MXSCOUT_DEV_DIR/skills/mendix-ticket-check"
if [ -f "$TICKET_SRC/SKILL.md" ]; then
  echo "mendix-ticket-check <- $TICKET_SRC"
  mkdir -p "$HERE/mendix-ticket-check"
  cp -R "$TICKET_SRC/." "$HERE/mendix-ticket-check/"
fi

echo "mendix-docs <- mendix-docs-source + $MXSCOUT_DIR"
node "$HERE/mendix-docs-source/pack-skill.js" "$HERE/mendix-docs" --mxscout "$MXSCOUT_DIR"

echo "selftest"
node "$HERE/mendix-docs-source/selftest.js" --mxscout "$MXSCOUT_DIR"

echo
echo "MxScout at $(git -C "$MXSCOUT_DIR" rev-parse --short HEAD 2>/dev/null || echo '?'), MxScout Dev at $(git -C "$MXSCOUT_DEV_DIR" rev-parse --short HEAD 2>/dev/null || echo '?'). Review with: git -C \"$HERE\" status"
