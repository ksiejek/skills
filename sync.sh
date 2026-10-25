#!/usr/bin/env bash
# Brings the skills in this repository up to date with MxScout, then checks mendix-docs.
#   ./sync.sh                      (~/Projects/MxScout)
#   MXSCOUT_DIR=/path/to/MxScout ./sync.sh
#
# mendix-describe and mendix-assist are not copied here any more (2026-10-25): their one home is MxScout's skills/
# (MxScout Dev 2.0 has no skills), and install.sh links them from there (skills.tsv).
# - mendix-docs/      is re-packed from mendix-docs-source/ with MxScout's engine and
#                     mendix-describe's checker and references;
# - docs/guide.md     is built from MxScout's public/guide-team.md plus docs/guide-mendix-docs.md
#                     (docs/build-full-guide.js) — edit those, never guide.md;
# - docs/guide.html   is copied from MxScout's public/guide-team.html (the team guide's one canonical
#                     page, which MxScout makes from its guide-team.md with tools/build-guide.js);
# - the mendix-docs selftest runs on MxScout's own test fixture.
# No dependencies: bash, cp and Node 18 or later.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MXSCOUT_DIR="${MXSCOUT_DIR:-$HOME/Projects/MxScout}"

if [ ! -f "$MXSCOUT_DIR/public/docs-file.js" ]; then
  echo "No MxScout repository at $MXSCOUT_DIR - set MXSCOUT_DIR." >&2
  exit 1
fi

echo "mendix-docs <- mendix-docs-source + $MXSCOUT_DIR"
node "$HERE/mendix-docs-source/pack-skill.js" "$HERE/mendix-docs" --mxscout "$MXSCOUT_DIR"

node "$HERE/docs/build-full-guide.js" "$MXSCOUT_DIR"
GUIDE_SRC="$MXSCOUT_DIR/public/guide-team.html"
if [ -f "$GUIDE_SRC" ]; then
  echo "docs/guide.html <- $GUIDE_SRC"
  cp "$GUIDE_SRC" "$HERE/docs/guide.html"
else
  echo "  note: no $GUIDE_SRC (an MxScout before 1.13.0) - docs/guide.html left as it is"
fi

echo "selftest"
node "$HERE/mendix-docs-source/selftest.js" --mxscout "$MXSCOUT_DIR"

echo
echo "MxScout at $(git -C "$MXSCOUT_DIR" rev-parse --short HEAD 2>/dev/null || echo '?'). Review with: git -C \"$HERE\" status"
