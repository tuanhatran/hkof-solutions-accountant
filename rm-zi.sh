#!/usr/bin/env bash
# Delete Windows "Zone.Identifier" files (copied as `<name>:Zone.Identifier`) under a folder.
# Usage: rm-zone-identifier.sh [-n] [folder]     (default folder: current directory)
#   -n  dry run: list what would be deleted, delete nothing
set -euo pipefail

dry=0
if [[ "${1:-}" == "-n" ]]; then dry=1; shift; fi
root="${1:-.}"

[[ -d "$root" ]] || { echo "Not a directory: $root" >&2; exit 1; }

# -print0 / -d '' keeps names with spaces or newlines safe.
count=0
while IFS= read -r -d '' f; do
  count=$((count + 1))
  if (( dry )); then
    printf 'would delete: %s\n' "$f"
  else
    rm -f -- "$f"
  fi
done < <(find "$root" -type f -name '*:Zone.Identifier' -print0)

if (( dry )); then
  echo "$count file(s) found (dry run, nothing deleted)."
else
  echo "$count file(s) deleted."
fi