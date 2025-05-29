#!/usr/bin/env bash
set -o errexit
npm install
npm run build
cd server
npm install
