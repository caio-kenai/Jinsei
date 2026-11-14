#!/usr/bin/env bash
# Builds the self-host bundle and its checksum for a release tag.
# Usage: scripts/selfhost-bundle.sh v0.0.4 [output-dir]
set -euo pipefail
tag="$1"
out="${2:-dist-release}"
version="${tag#v}"
files=(
  .env.selfhost.example
  LICENSE
  ADDITIONAL_TERMS.md
  README.md
  SECURITY.md
  THIRD_PARTY_NOTICES.md
  compose.selfhost.yml
  docker/caddy/Caddyfile
  docs/INTEGRATIONS.md
  docs/SELFHOST.md
)
mkdir -p "$out"
git archive --format=zip -o "$out/Jinsei-$version-selfhost.zip" "$tag" "${files[@]}"
(cd "$out" && sha256sum "Jinsei-$version-selfhost.zip" > SHA256SUMS)
echo "$out/Jinsei-$version-selfhost.zip"
