#!/usr/bin/env bash
# Changed-line coverage gate: at least DIFF_COVER_MIN (default 80) percent of the
# lines touched relative to <base-rev> must be covered.
#
# Usage: scripts/diff-coverage.sh <base-rev> [backend|frontend|all]
#
# Backend lines come from the JaCoCo XML report (backend/target/site/jacoco/jacoco.xml),
# frontend lines from the Vitest Clover XML report (frontend/coverage/clover.xml).
# Each report runs in its own diff-cover invocation: diff-cover intersects the file
# sets of combined reports, which would lose coverage.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

BASE="${1:-}"
if [ -z "$BASE" ] || printf '%s' "$BASE" | grep -qE '^0+$'; then
  BASE="main"
fi
SIDE="${2:-all}"
MIN="${DIFF_COVER_MIN:-80}"

if command -v diff-cover >/dev/null 2>&1; then
  DIFF_COVER=(diff-cover)
elif command -v uvx >/dev/null 2>&1; then
  DIFF_COVER=(uvx --quiet --from diff-cover==10.6.0 diff-cover)
else
  echo "error: neither diff-cover nor uvx is available on PATH" >&2
  exit 1
fi

run_backend() {
  local report="backend/target/site/jacoco/jacoco.xml"
  if [ ! -f "$report" ]; then
    echo "error: $report is missing; run 'cd backend && ./mvnw -B verify' first" >&2
    exit 1
  fi
  echo "== changed-line coverage, backend (>= ${MIN}%) vs ${BASE} =="
  "${DIFF_COVER[@]}" "$report" \
    --include-untracked \
    --compare-branch="$BASE" \
    --fail-under="$MIN" \
    --src-roots backend/src/main/java
}

run_frontend() {
  local report="frontend/coverage/clover.xml"
  if [ ! -f "$report" ]; then
    echo "error: $report is missing; run 'cd frontend && npm run test:coverage' first" >&2
    exit 1
  fi
  echo "== changed-line coverage, frontend (>= ${MIN}%) vs ${BASE} =="
  "${DIFF_COVER[@]}" "$report" \
    --include-untracked \
    --compare-branch="$BASE" \
    --fail-under="$MIN"
}

case "$SIDE" in
  backend) run_backend ;;
  frontend) run_frontend ;;
  all)
    run_backend
    run_frontend
    ;;
  *)
    echo "usage: scripts/diff-coverage.sh <base-rev> [backend|frontend|all]" >&2
    exit 2
    ;;
esac
