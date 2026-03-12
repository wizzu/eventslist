#!/usr/bin/env bash
# Update vendored Alpine.js to the latest release.
# Designed for macOS/Linux. See README for Windows notes.
set -euo pipefail

VENDOR_DIR="$(cd "$(dirname "$0")/../spa/static/vendor" && pwd)"
SYMLINK="$VENDOR_DIR/alpine.min.js"

# Derive current version from symlink target: alpine-3.15.8.min.js -> 3.15.8
current=$(readlink "$SYMLINK" | sed 's/alpine-\(.*\)\.min\.js/\1/')
echo "Current version: $current"

latest_tag=$(curl -fsSL https://api.github.com/repos/alpinejs/alpine/releases/latest \
  | grep '"tag_name"' \
  | sed 's/.*"tag_name": *"v\([^"]*\)".*/\1/')

if [ -z "$latest_tag" ]; then
  echo "Error: could not fetch latest version from GitHub API" >&2
  exit 1
fi

echo "Latest version:  $latest_tag"

if [ "$current" = "$latest_tag" ]; then
  echo "Already up to date."
  exit 0
fi

new_file="alpine-${latest_tag}.min.js"
url="https://unpkg.com/alpinejs@${latest_tag}/dist/cdn.min.js"

echo "Downloading $url ..."
curl -fsSL "$url" -o "$VENDOR_DIR/$new_file"

# Sanity check: file must be at least 10KB
size=$(wc -c < "$VENDOR_DIR/$new_file")
if [ "$size" -lt 10240 ]; then
  echo "Error: downloaded file is suspiciously small (${size} bytes), aborting" >&2
  rm "$VENDOR_DIR/$new_file"
  exit 1
fi

# Sanity check: version string must appear in the file
if ! grep -q "\"version\":\"${latest_tag}\"" "$VENDOR_DIR/$new_file"; then
  echo "Error: version string \"version\":\"${latest_tag}\" not found in downloaded file, aborting" >&2
  rm "$VENDOR_DIR/$new_file"
  exit 1
fi

# Re-point the symlink
ln -sf "$new_file" "$SYMLINK"

# Sanity check: symlink target matches expected filename
actual=$(readlink "$SYMLINK")
if [ "$actual" != "$new_file" ]; then
  echo "Error: symlink points to '$actual', expected '$new_file'" >&2
  exit 1
fi

echo "Updated $current -> $latest_tag"
echo "Old file left in place: alpine-${current}.min.js (remove manually if desired)"
