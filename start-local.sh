#!/bin/bash
# ============================================
# TITANTRACK LOCAL DEV - Start Script
# ============================================
# Usage: cd ~/Desktop/rossbased-app && ./start-local.sh
#
# Starts backend (port 5001) and frontend (port 3000)
# Frontend auto-points to local backend
# Press Ctrl+C to stop both
# ============================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}⚡ TITANTRACK LOCAL DEV${NC}"
echo "================================"

# Check server .env exists
if [ ! -f "server/.env" ]; then
  echo -e "${YELLOW}⚠️  No server/.env found!${NC}"
  echo ""
  echo "Setup steps:"
  echo "  1. cp server/.env.template server/.env"
  echo "  2. Open server/.env and paste your values from Render"
  echo "  3. Run this script again"
  echo ""
  exit 1
fi

# Kill any existing processes on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null

echo -e "Starting backend on :5001..."
cd server && node app.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

echo -e "Starting frontend on :3000..."
echo -e "Mobile testing: open http://$(ipconfig getifaddr en0 2>/dev/null || echo 'YOUR_IP'):3000 on your phone"
echo ""
echo -e "${GREEN}✅ Both running. Press Ctrl+C to stop.${NC}"
echo "================================"
echo ""

REACT_APP_API_URL=http://localhost:5001 npm start &
FRONTEND_PID=$!

# Cleanup on Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# Wait for both
wait
