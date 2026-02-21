#!/usr/bin/env node
// Dummy update-ip.js for Docker builds
// In Docker, IP detection is handled by environment variables
// This file exists only to prevent npm prestart errors

console.log('Skipping IP update in Docker environment');
process.exit(0);
