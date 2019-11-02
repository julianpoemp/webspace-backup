#!/usr/bin/env bash

targets="node12-linux-x64,node12-macos-x64,node12-win-x64"
#targets="node12-macos-x64"
#targets="node12-linux-armv7"

version="v0.0.2"

echo "prebuild..."
npm run prestart

echo "remove old files..."
rm -rf prod && mkdir prod

echo "build binaries..."
pkg -t "$targets" -o prod/webspace-backup dist/environments/app.prod.js

echo "Copy assets"
mkdir prod/webspace-backup-${version}-x64-win
mkdir prod/webspace-backup-${version}-x64-linux
mkdir prod/webspace-backup-${version}-x64-macos

mv prod/webspace-backup-linux prod/webspace-backup-${version}-x64-linux/webspace-backup
mv prod/webspace-backup-win.exe prod/webspace-backup-${version}-x64-win/webspace-backup.exe
mv prod/webspace-backup-macos prod/webspace-backup-${version}-x64-macos/webspace-backup

cp src/config_sample.json prod/webspace-backup-${version}-x64-win/config.json
cp src/config_sample.json prod/webspace-backup-${version}-x64-linux/config.json
cp src/config_sample.json prod/webspace-backup-${version}-x64-macos/config.json

cd prod

cd webspace-backup-${version}-x64-win
zip -r -X ../webspace-backup-${version}-x64-win.zip ./
cd ..

cd webspace-backup-${version}-x64-macos
zip -r -X ../webspace-backup-${version}-x64-macos.zip ./
cd ..

cd webspace-backup-${version}-x64-linux
zip -r -X ../webspace-backup-${version}-x64-linux.zip ./
cd ..

rm -rf webspace-backup-${version}-x64-linux
rm -rf webspace-backup-${version}-x64-macos
rm -rf webspace-backup-${version}-x64-win

echo "Build finished"
