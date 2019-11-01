#!/usr/bin/env bash

targets="node12-linux-x64,node12-macos-x64,node12-win-x64"
#targets="node12-macos-x64"
#targets="node12-linux-armv7"

echo "prebuild..."
npm run prestart

echo "remove old files..."
rm -rf prod && mkdir prod

echo "build binaries..."
pkg -t "$targets" -o prod/webspace-backup dist/environments/app.prod.js

echo "Copy assets"
mkdir prod/webspace-backup-beta1-x64-win
mkdir prod/webspace-backup-beta1-x64-linux
mkdir prod/webspace-backup-beta1-x64-macos

mv prod/webspace-backup-linux prod/webspace-backup-beta1-x64-linux/webspace-backup
mv prod/webspace-backup-win.exe prod/webspace-backup-beta1-x64-win/webspace-backup.exe
mv prod/webspace-backup-macos prod/webspace-backup-beta1-x64-macos/webspace-backup

cp src/config_sample.json prod/webspace-backup-beta1-x64-win/config.json
cp src/config_sample.json prod/webspace-backup-beta1-x64-linux/config.json
cp src/config_sample.json prod/webspace-backup-beta1-x64-macos/config.json

zip -r -X prod/webspace-backup-beta1-x64-win.zip prod/webspace-backup-beta1-x64-win
zip -r -X prod/webspace-backup-beta1-x64-macos.zip prod/webspace-backup-beta1-x64-macos
zip -r -X prod/webspace-backup-beta1-x64-linux.zip prod/webspace-backup-beta1-x64-linux
echo "Build finished"
