#!/usr/bin/env bash

targets="node12-linux-x64,node12-macos-x64"
#targets="node12-macos-x64"
#targets="node12-linux-armv7"

echo "prebuild..."
npm run prestart

echo "remove old files..."
rm -rf prod && mkdir prod

echo "build binaries..."
pkg -t "$targets" -o prod/webspace-backup dist/app.js

echo "Copy assets"
echo "Build finished"
