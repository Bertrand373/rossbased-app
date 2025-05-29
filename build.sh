#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install frontend dependencies and build
npm install
npm run build

# Change to server directory and install backend dependencies
cd server
npm install

# Return to root directory
cd ..

# Create directory for deployment (if using Render, this is not necessary)
# mkdir -p ./dist/
# cp -R ./build ./dist/client
# cp -R ./server ./dist/server
