#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-v1.0.0}"
WORKDIR="$(pwd)"
RELEASE_DIR="${WORKDIR}/release-${VERSION}"
echo "Preparing release ${VERSION} in ${RELEASE_DIR}"

# 1. Ensure repo clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean. Commit or stash changes first."
  exit 1
fi

# 2. Build client
echo "Installing and building client..."
cd "${WORKDIR}/client"
npm install --legacy-peer-deps
npm run build
cd "${WORKDIR}"

# 3. Prepare release folder
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

echo "Copying files..."
rsync -av --exclude='node_modules' --exclude='.git' --exclude='client/src' --exclude='client/node_modules' --exclude='client/public' --exclude='uploads' ./ "${RELEASE_DIR}/"

# Replace client directory with build only
rm -rf "${RELEASE_DIR}/client"
mkdir -p "${RELEASE_DIR}/client"
cp -r "${WORKDIR}/client/build" "${RELEASE_DIR}/client/build"

# 4. Create archives
cd "$(dirname "${RELEASE_DIR}")"
tar -czf video-creation-studio-${VERSION}.tar.gz "$(basename "${RELEASE_DIR}")"
zip -r video-creation-studio-${VERSION}.zip "$(basename "${RELEASE_DIR}")" -x "*/node_modules/*" ".git/*"

# 5. Checksums
sha256sum video-creation-studio-${VERSION}.tar.gz > video-creation-studio-${VERSION}.tar.gz.sha256
sha256sum video-creation-studio-${VERSION}.zip > video-creation-studio-${VERSION}.zip.sha256

echo "Release artifacts:"
ls -lh video-creation-studio-${VERSION}*

echo "Done. To publish to GitHub Releases (requires gh CLI):"
echo "  gh release create ${VERSION} video-creation-studio-${VERSION}.tar.gz video-creation-studio-${VERSION}.zip --title \"${VERSION}\" --notes \"Release ${VERSION}: includes Bull/worker, docker-compose, and frontend build.\""
echo "Or upload artifacts via the GitHub web UI."
