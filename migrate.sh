#!/bin/bash

# Video/Audio Transmission Fix - Migration Script
# This script safely backs up and replaces the fixed files

set -e  # Exit on error

echo "=================================================="
echo "  Video/Audio Transmission System - Fix Migration"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -d "server" ] || [ ! -d "mobile-app" ] || [ ! -d "src" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Creating backups in: $BACKUP_DIR${NC}"
echo ""

# Backup server files
echo "📦 Backing up server files..."
mkdir -p "$BACKUP_DIR/server/src/sfu"
cp server/src/sfu/SFUHandler.js "$BACKUP_DIR/server/src/sfu/SFUHandler.js" 2>/dev/null || echo "  ⚠️  SFUHandler.js not found"
cp server/src/sfu/RoomRouter.js "$BACKUP_DIR/server/src/sfu/RoomRouter.js" 2>/dev/null || echo "  ⚠️  RoomRouter.js not found"

# Backup mobile files
echo "📦 Backing up mobile app files..."
mkdir -p "$BACKUP_DIR/mobile-app/src/hooks"
cp mobile-app/src/hooks/useSFU.js "$BACKUP_DIR/mobile-app/src/hooks/useSFU.js" 2>/dev/null || echo "  ⚠️  useSFU.js not found"

# Backup web files
echo "📦 Backing up web app files..."
mkdir -p "$BACKUP_DIR/src/services"
cp src/services/SFUManager.ts "$BACKUP_DIR/src/services/SFUManager.ts" 2>/dev/null || echo "  ⚠️  SFUManager.ts not found"

echo -e "${GREEN}✅ Backups complete!${NC}"
echo ""

# Prompt for confirmation
echo -e "${YELLOW}⚠️  This will replace your existing SFU files with the fixed versions.${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 1
fi

echo ""
echo "🔧 Applying fixes..."
echo ""

# Check if fixed files exist
if [ ! -f "SFUHandler.js" ] || [ ! -f "RoomRouter.js" ] || [ ! -f "useSFU.js" ] || [ ! -f "SFUManager.ts" ]; then
    echo -e "${RED}Error: Fixed files not found in current directory${NC}"
    echo "Please ensure the following files are present:"
    echo "  - SFUHandler.js"
    echo "  - RoomRouter.js"
    echo "  - useSFU.js"
    echo "  - SFUManager.ts"
    exit 1
fi

# Copy server files
echo "📝 Updating server files..."
cp SFUHandler.js server/src/sfu/
cp RoomRouter.js server/src/sfu/
echo -e "${GREEN}  ✅ Server files updated${NC}"

# Copy mobile files
echo "📝 Updating mobile app files..."
cp useSFU.js mobile-app/src/hooks/
echo -e "${GREEN}  ✅ Mobile app files updated${NC}"

# Copy web files
echo "📝 Updating web app files..."
cp SFUManager.ts src/services/
echo -e "${GREEN}  ✅ Web app files updated${NC}"

echo ""
echo -e "${GREEN}=================================================="
echo "  Migration Complete! ✅"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Restart the server:"
echo "   cd server && npm restart"
echo ""
echo "2. Restart the mobile app (if running):"
echo "   cd mobile-app && npm run android  # or npm run ios"
echo ""
echo "3. Restart the web app:"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}📁 Backups saved in: $BACKUP_DIR${NC}"
echo ""
echo "If you encounter issues, you can restore from backups:"
echo "  cp $BACKUP_DIR/server/src/sfu/* server/src/sfu/"
echo "  cp $BACKUP_DIR/mobile-app/src/hooks/* mobile-app/src/hooks/"
echo "  cp $BACKUP_DIR/src/services/* src/services/"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
