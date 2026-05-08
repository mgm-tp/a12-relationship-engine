#!/usr/bin/env bash
# Detects duplicate virtual store entries for packages that rely on module augmentation.
# When pnpm creates multiple copies (different peer contexts), TypeScript module augmentation
# breaks because declare module targets resolve to different module identities.
#
# Usage: ./scripts/check-duplicate-peers.sh

set -euo pipefail

# Packages that use module augmentation on A12ApplicationConfig.
# If pnpm creates multiple copies of these, TS compilation will fail.
CRITICAL_PACKAGES=(
  "@com.mgmtp.a12.client+client-core"
  "@com.mgmtp.a12.formengine+formengine-core"
  "@com.mgmtp.a12.overviewengine+overviewengine-core"
)

PNPM_DIR="node_modules/.pnpm"
EXIT_CODE=0

if [ ! -d "$PNPM_DIR" ]; then
  echo "No $PNPM_DIR directory found. Run pnpm install first."
  exit 1
fi

for pkg in "${CRITICAL_PACKAGES[@]}"; do
  count=$(find "$PNPM_DIR" -maxdepth 1 -type d -name "${pkg}@*" | wc -l | tr -d ' ')

  if [ "$count" -gt 1 ]; then
    echo "ERROR: Found $count copies of $pkg in $PNPM_DIR"
    echo "  Module augmentation on A12ApplicationConfig will break."
    echo "  Copies:"
    find "$PNPM_DIR" -maxdepth 1 -type d -name "${pkg}@*" -exec basename {} \;
    echo ""
    echo "  This usually means a transitive peer dependency differs across workspace packages."
    echo "  Check which peer differs by comparing the node_modules/ inside each copy."
    echo ""
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "No duplicate peer contexts found for module-augmented packages."
fi

exit $EXIT_CODE
