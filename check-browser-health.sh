#!/bin/bash

# Cloud Browser - Health Check Script
# Verifies all components are working correctly

echo "🔍 Cloud Browser Health Check"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check Xvfb
echo "1. Checking Xvfb..."
if pgrep -x "Xvfb" > /dev/null; then
    check_pass "Xvfb is running"
else
    check_fail "Xvfb is not running"
    echo "   Start with: Xvfb :99 -screen 0 1280x720x24 &"
fi
echo ""

# 2. Check PulseAudio
echo "2. Checking PulseAudio..."
if pulseaudio --check 2>/dev/null; then
    check_pass "PulseAudio is running"
else
    check_fail "PulseAudio is not running"
    echo "   Start with: pulseaudio --start"
fi
echo ""

# 3. Check FFmpeg
echo "3. Checking FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    VERSION=$(ffmpeg -version 2>&1 | head -n1)
    check_pass "FFmpeg installed: $VERSION"
else
    check_fail "FFmpeg not found"
    echo "   Install with: sudo apt-get install ffmpeg"
fi
echo ""

# 4. Check Chromium
echo "4. Checking Chromium..."
if command -v chromium &> /dev/null; then
    VERSION=$(chromium --version 2>&1)
    check_pass "Chromium installed: $VERSION"
elif command -v chromium-browser &> /dev/null; then
    VERSION=$(chromium-browser --version 2>&1)
    check_pass "Chromium installed: $VERSION"
elif [ -f "/usr/bin/chromium" ]; then
    VERSION=$(/usr/bin/chromium --version 2>&1)
    check_pass "Chromium installed: $VERSION"
else
    check_fail "Chromium not found"
    echo "   Install with: sudo apt-get install chromium"
fi
echo ""

# 5. Check Node.js
echo "5. Checking Node.js..."
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    check_pass "Node.js installed: $VERSION"
else
    check_fail "Node.js not found"
fi
echo ""

# 6. Check npm packages
echo "6. Checking npm packages..."
if [ -d "server/node_modules" ]; then
    check_pass "Server dependencies installed"
else
    check_warn "Server dependencies not installed"
    echo "   Run: cd server && npm install"
fi
echo ""

# 7. Check environment variables
echo "7. Checking environment variables..."
if [ -n "$DISPLAY" ]; then
    check_pass "DISPLAY is set: $DISPLAY"
else
    check_warn "DISPLAY not set"
    echo "   Set with: export DISPLAY=:99"
fi
echo ""

# 8. Check Docker (if available)
echo "8. Checking Docker..."
if command -v docker &> /dev/null; then
    VERSION=$(docker --version)
    check_pass "Docker installed: $VERSION"
    
    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_warn "Docker daemon is not running"
    fi
else
    check_warn "Docker not found (optional)"
fi
echo ""

# 9. Check server port
echo "9. Checking server port..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_pass "Server is running on port 3001"
else
    check_warn "Server is not running on port 3001"
    echo "   Start with: cd server && npm run dev"
fi
echo ""

# 10. Test FFmpeg capture
echo "10. Testing FFmpeg screen capture..."
if [ -n "$DISPLAY" ] && pgrep -x "Xvfb" > /dev/null; then
    if timeout 2 ffmpeg -f x11grab -video_size 100x100 -framerate 1 -i $DISPLAY -frames:v 1 -f null - &> /dev/null; then
        check_pass "FFmpeg can capture from display"
    else
        check_fail "FFmpeg cannot capture from display"
    fi
else
    check_warn "Skipping (Xvfb not running or DISPLAY not set)"
fi
echo ""

# Summary
echo "=============================="
echo "Summary:"
echo ""
echo "Prerequisites:"
echo "  - Xvfb: $(pgrep -x "Xvfb" > /dev/null && echo "✅" || echo "❌")"
echo "  - PulseAudio: $(pulseaudio --check 2>/dev/null && echo "✅" || echo "❌")"
echo "  - FFmpeg: $(command -v ffmpeg &> /dev/null && echo "✅" || echo "❌")"
echo "  - Chromium: $(command -v chromium &> /dev/null || command -v chromium-browser &> /dev/null && echo "✅" || echo "❌")"
echo ""
echo "Optional:"
echo "  - Docker: $(command -v docker &> /dev/null && echo "✅" || echo "⚠️")"
echo "  - Server running: $(lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 && echo "✅" || echo "⚠️")"
echo ""

# Final recommendation
if pgrep -x "Xvfb" > /dev/null && pulseaudio --check 2>/dev/null && command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}🎉 All core components are ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start server: cd server && npm run dev"
    echo "  2. Start client: npm run dev"
    echo "  3. Open http://localhost:5173"
    echo "  4. Create a room and click 'Virtual Browser'"
else
    echo -e "${YELLOW}⚠️  Some components are missing${NC}"
    echo ""
    echo "Quick setup:"
    echo "  1. Install dependencies: sudo apt-get install xvfb pulseaudio ffmpeg chromium"
    echo "  2. Start Xvfb: Xvfb :99 -screen 0 1280x720x24 &"
    echo "  3. Start PulseAudio: pulseaudio --start"
    echo "  4. Set DISPLAY: export DISPLAY=:99"
    echo "  5. Run this script again"
fi
echo ""
