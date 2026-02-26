#!/usr/bin/env bash
set -euo pipefail

# ─── Release Automation ─────────────────────────────────────────
# Usage:
#   ./scripts/release.sh               # auto-detect from commits
#   ./scripts/release.sh patch          # force patch
#   ./scripts/release.sh minor          # force minor
#   ./scripts/release.sh major          # force major
#   ./scripts/release.sh 2.6.0          # explicit version
#   ./scripts/release.sh --dry-run      # auto-detect, preview only

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# ─── Parse Args ──────────────────────────────────────────────────
DRY_RUN=false
BUMP_ARG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)         BUMP_ARG="$arg" ;;
  esac
done

# ─── Read Current Version ───────────────────────────────────────
PKG="$ROOT_DIR/package.json"
PLUGIN="$ROOT_DIR/.claude-plugin/plugin.json"
MARKETPLACE="$ROOT_DIR/.claude-plugin/marketplace.json"

CURRENT=$(node -e "console.log(require('$PKG').version)" 2>/dev/null) \
  || CURRENT=$(grep '"version"' "$PKG" | head -1 | sed 's/.*"\([0-9][0-9.]*\)".*/\1/')

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# ─── Auto-detect bump type from commits ──────────────────────────
auto_detect_bump() {
  local last_tag
  last_tag=$(git -C "$ROOT_DIR" describe --tags --abbrev=0 2>/dev/null || echo "")

  local commits
  if [[ -n "$last_tag" ]]; then
    commits=$(git -C "$ROOT_DIR" log "${last_tag}..HEAD" --oneline 2>/dev/null || echo "")
  else
    commits=$(git -C "$ROOT_DIR" log --oneline -20 2>/dev/null || echo "")
  fi

  if [[ -z "$commits" ]]; then
    echo "patch"
    return
  fi

  # BREAKING CHANGE or feat!:/fix!: → major
  if echo "$commits" | grep -qiE '(BREAKING.CHANGE|^[a-f0-9]+ \w+!)'; then
    echo "major"
    return
  fi

  # feat: → minor
  if echo "$commits" | grep -qiE '^[a-f0-9]+ feat'; then
    echo "minor"
    return
  fi

  # everything else → patch
  echo "patch"
}

# ─── Calculate New Version ───────────────────────────────────────
if [[ -z "$BUMP_ARG" ]]; then
  BUMP_ARG=$(auto_detect_bump)
  info "Auto-detected bump type: ${CYAN}${BUMP_ARG}${NC}"

  # Show commits used for detection
  LAST_TAG=$(git -C "$ROOT_DIR" describe --tags --abbrev=0 2>/dev/null || echo "")
  if [[ -n "$LAST_TAG" ]]; then
    echo -e "  Commits since ${YELLOW}${LAST_TAG}${NC}:"
    git -C "$ROOT_DIR" log "${LAST_TAG}..HEAD" --oneline | sed 's/^/    /'
  fi
  echo ""
fi

case "$BUMP_ARG" in
  patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
  minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
  major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
  *)
    if [[ "$BUMP_ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      NEW_VERSION="$BUMP_ARG"
    else
      fail "Invalid version: $BUMP_ARG (expected patch|minor|major|X.Y.Z)"
    fi
    ;;
esac

echo ""
echo -e "${CYAN}═══ Release $CURRENT → $NEW_VERSION ═══${NC}"
$DRY_RUN && echo -e "${YELLOW}(dry-run mode — no changes will be made)${NC}"
echo ""

# ─── Check Working Tree ─────────────────────────────────────────
if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  warn "Uncommitted changes detected — they will be included in the release commit"
  echo ""
fi

# ─── Step 1: Version Bump ───────────────────────────────────────
info "Bumping versions in 3 files..."

bump_json() {
  local file="$1"
  local tmp="${file}.tmp"

  if $DRY_RUN; then
    ok "  (dry-run) $file"
    return
  fi

  # Use node for reliable JSON manipulation
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$file', 'utf8'));

    // Update top-level version
    if (data.version) data.version = '$NEW_VERSION';

    // marketplace.json: metadata.version + plugins[].version
    if (data.metadata && data.metadata.version) data.metadata.version = '$NEW_VERSION';
    if (data.plugins) {
      data.plugins.forEach(p => { if (p.version) p.version = '$NEW_VERSION'; });
    }

    fs.writeFileSync('$file', JSON.stringify(data, null, 2) + '\n');
  "
  ok "  $file"
}

bump_json "$PKG"
bump_json "$PLUGIN"
bump_json "$MARKETPLACE"
echo ""

# ─── Step 2: Build ───────────────────────────────────────────────
info "Building..."
if $DRY_RUN; then
  ok "  (dry-run) npm run build"
else
  (cd "$ROOT_DIR" && npm run build --silent) || fail "Build failed — aborting"
  ok "  Build passed"
fi
echo ""

# ─── Step 3: Test ────────────────────────────────────────────────
info "Testing..."
if $DRY_RUN; then
  ok "  (dry-run) npm test"
else
  (cd "$ROOT_DIR" && npm test --silent 2>&1) || fail "Tests failed — aborting"
  ok "  Tests passed"
fi
echo ""

# ─── Step 4: Commit ─────────────────────────────────────────────
info "Committing..."
if $DRY_RUN; then
  ok "  (dry-run) git commit -m 'chore: release v$NEW_VERSION'"
else
  (cd "$ROOT_DIR" && git add -A && git commit -m "chore: release v$NEW_VERSION") \
    || fail "Commit failed"
  ok "  Committed"
fi
echo ""

# ─── Step 5: Tag ────────────────────────────────────────────────
info "Tagging v$NEW_VERSION..."
if $DRY_RUN; then
  ok "  (dry-run) git tag -a v$NEW_VERSION"
else
  (cd "$ROOT_DIR" && git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION") \
    || fail "Tag failed"
  ok "  Tagged"
fi
echo ""

# ─── Step 6: Push ───────────────────────────────────────────────
info "Pushing to origin..."
if $DRY_RUN; then
  ok "  (dry-run) git push origin main --follow-tags"
else
  (cd "$ROOT_DIR" && git push origin main --follow-tags) \
    || fail "Push failed"
  ok "  Pushed"
fi
echo ""

# ─── Step 7: GitHub Release ─────────────────────────────────────
info "Creating GitHub release..."
if $DRY_RUN; then
  ok "  (dry-run) gh release create v$NEW_VERSION --generate-notes"
else
  (cd "$ROOT_DIR" && gh release create "v$NEW_VERSION" --generate-notes) \
    || warn "GitHub release failed (create manually: gh release create v$NEW_VERSION --generate-notes)"
  ok "  Released"
fi
echo ""

# ─── Done ────────────────────────────────────────────────────────
echo -e "${GREEN}═══ v$NEW_VERSION released successfully ═══${NC}"
echo ""
