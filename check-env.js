/**
 * This script checks and fixes JWT_SECRET formatting in .env files
 * Run this to ensure all .env files have consistent JWT_SECRET values
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'server', '.env')
];

console.log('🔍 Checking JWT_SECRET in .env files...\n');

let hasIssues = false;

envFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const jwtLine = lines.find(line => line.trim().startsWith('JWT_SECRET'));
  
  if (!jwtLine) {
    console.log(`⚠️  JWT_SECRET not found in: ${filePath}`);
    return;
  }

  // Check if there's a space after the equals sign
  const hasSpace = jwtLine.includes('JWT_SECRET= ');
  const value = jwtLine.split('=')[1];
  
  console.log(`📄 ${path.relative(__dirname, filePath)}`);
  console.log(`   Current: ${jwtLine}`);
  
  if (hasSpace) {
    console.log(`   ❌ ISSUE: Space detected after '=' sign`);
    console.log(`   Value with quotes: "${value}"`);
    console.log(`   Value length: ${value ? value.length : 0} characters`);
    hasIssues = true;
  } else {
    console.log(`   ✅ OK: No space after '=' sign`);
    console.log(`   Value: ${value ? value.substring(0, 10) + '...' : 'empty'}`);
  }
  console.log('');
});

if (hasIssues) {
  console.log('\n⚠️  ISSUES FOUND!');
  console.log('\n📝 To fix:');
  console.log('1. Open each .env file listed above');
  console.log('2. Change "JWT_SECRET= value" to "JWT_SECRET=value" (remove space after =)');
  console.log('3. Save the file');
  console.log('4. Restart your dev server');
  console.log('5. Clear browser localStorage (F12 > Application > Local Storage > Clear All)');
  console.log('\nOr run: node fix-env.js (to auto-fix)');
} else {
  console.log('✅ All .env files look good!');
  console.log('\nIf you still see auth errors:');
  console.log('1. Restart your dev server (Ctrl+C, then npm run dev)');
  console.log('2. Clear browser cache and localStorage');
  console.log('3. Log out and log back in to get a fresh token');
}
