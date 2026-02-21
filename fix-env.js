/**
 * This script automatically fixes JWT_SECRET formatting in .env files
 * It removes spaces after the equals sign
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

console.log('🔧 Fixing JWT_SECRET in .env files...\n');

let fixedCount = 0;

envFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Fix all environment variables with spaces after =
  // This regex matches KEY= VALUE and replaces with KEY=VALUE
  content = content.replace(/^([A-Z_]+)=\s+(.+)$/gm, '$1=$2');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
    fixedCount++;
  } else {
    console.log(`✓  No changes needed: ${path.relative(__dirname, filePath)}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} file(s)`);

if (fixedCount > 0) {
  console.log('\n⚠️  IMPORTANT NEXT STEPS:');
  console.log('1. Restart your dev server (Ctrl+C in both terminals, then npm run dev)');
  console.log('2. Clear browser localStorage:');
  console.log('   - Press F12 to open DevTools');
  console.log('   - Go to Application tab > Local Storage');
  console.log('   - Right-click and select "Clear"');
  console.log('3. Refresh the page and log in again');
}
