#!/usr/bin/env bash
# Fetch upstream content from a microsoft/skills-for-copilot-studio release.
#
# Downloads the release tarball and extracts content directories into the repo,
# replacing local copies. This replaces the fork-and-merge sync model.
#
# Usage:
#   bash scripts/fetch-upstream.sh [--version <tag>] [--dry-run]
#
# Options:
#   --version <tag>   Upstream release tag to fetch (e.g. v1.0.10).
#                     Defaults to the version in upstream-version.json.
#   --dry-run         Show what would be fetched/replaced without writing files.
#
# Environment variables:
#   GH_TOKEN          Optional GitHub token for authenticated API access.
#                     Unauthenticated requests have lower rate limits.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM_REPO="microsoft/skills-for-copilot-studio"
VERSION=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Resolve version from upstream-version.json if not specified
if [[ -z "$VERSION" ]]; then
  if [[ -f "$REPO_ROOT/upstream-version.json" ]]; then
    VERSION=$(node -e "console.log(require('$REPO_ROOT/upstream-version.json').upstream_version)")
  else
    echo "ERROR: No --version specified and upstream-version.json not found"
    exit 1
  fi
fi

echo "==> Fetching upstream content from $UPSTREAM_REPO @ $VERSION"

# Build the tarball URL (public, no auth required)
TARBALL_URL="https://github.com/$UPSTREAM_REPO/archive/refs/tags/$VERSION.tar.gz"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "   Downloading $TARBALL_URL..."
if ! curl -sfL "$TARBALL_URL" -o "$WORK_DIR/upstream.tar.gz"; then
  echo "ERROR: Failed to download upstream release $VERSION"
  echo "   URL: $TARBALL_URL"
  echo "   Does the tag exist at https://github.com/$UPSTREAM_REPO/releases/tag/$VERSION ?"
  exit 1
fi

echo "   Extracting..."
tar -xzf "$WORK_DIR/upstream.tar.gz" -C "$WORK_DIR"

# The tarball extracts to skills-for-copilot-studio-<version>/ (tag without 'v' prefix)
EXTRACTED_DIR=$(ls -d "$WORK_DIR"/skills-for-copilot-studio-*/ 2>/dev/null | head -1)
if [[ -z "$EXTRACTED_DIR" ]]; then
  echo "ERROR: Could not find extracted directory in tarball"
  ls "$WORK_DIR"
  exit 1
fi

# Directories to sync from upstream
CONTENT_DIRS=(
  agents
  skills
  scripts/src
  templates
  reference
  patterns
  hooks
  evals
)

# Individual files to sync
CONTENT_FILES=(
  hooks/hooks.json
  hooks/system-prompt.md
  scripts/package.json
)

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "==> Dry run — would sync the following:"
  for dir in "${CONTENT_DIRS[@]}"; do
    if [[ -d "$EXTRACTED_DIR/$dir" ]]; then
      echo "   [dir]  $dir/ ($(find "$EXTRACTED_DIR/$dir" -type f | wc -l | tr -d ' ') files)"
    else
      echo "   [dir]  $dir/ (not in upstream release)"
    fi
  done
  for f in "${CONTENT_FILES[@]}"; do
    if [[ -f "$EXTRACTED_DIR/$f" ]]; then
      echo "   [file] $f"
    fi
  done
  echo ""
  echo "==> No files were modified (dry run)"
  exit 0
fi

echo "==> Syncing content directories..."
for dir in "${CONTENT_DIRS[@]}"; do
  if [[ -d "$EXTRACTED_DIR/$dir" ]]; then
    # Remove local copy and replace with upstream
    rm -rf "$REPO_ROOT/$dir"
    mkdir -p "$(dirname "$REPO_ROOT/$dir")"
    cp -R "$EXTRACTED_DIR/$dir" "$REPO_ROOT/$dir"
    FILE_COUNT=$(find "$REPO_ROOT/$dir" -type f | wc -l | tr -d ' ')
    echo "   $dir/ ($FILE_COUNT files)"
  else
    echo "   $dir/ — not present in upstream $VERSION (skipped)"
  fi
done

echo "==> Syncing individual files..."
for f in "${CONTENT_FILES[@]}"; do
  if [[ -f "$EXTRACTED_DIR/$f" ]]; then
    mkdir -p "$(dirname "$REPO_ROOT/$f")"
    cp "$EXTRACTED_DIR/$f" "$REPO_ROOT/$f"
    echo "   $f"
  fi
done

# Rebuild script bundles if scripts/src was updated and npm is available
if [[ -d "$EXTRACTED_DIR/scripts/src" ]] && command -v npm &>/dev/null; then
  echo "==> Rebuilding script bundles..."
  cd "$REPO_ROOT/scripts"
  npm install --silent 2>/dev/null || true
  npm run build --silent 2>/dev/null && echo "   Bundles rebuilt" || echo "   WARN: Bundle rebuild failed (run manually: cd scripts && npm run build)"
  cd "$REPO_ROOT"
fi

echo ""
echo "==> Upstream content synced from $UPSTREAM_REPO @ $VERSION"
echo "   Review changes with: git diff --stat"
echo "   Test the build with: bash extension/test-local.sh --package-only"
