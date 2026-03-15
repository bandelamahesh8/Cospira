import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';
const envPath = path.join(securityDir, '.env');
try {
  if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      
      // Remove any angle brackets that might have been left from template <password>
      const cleaned = content.replace(/[<>]/g, '');
      
      if (cleaned !== content) {
          fs.writeFileSync(envPath, cleaned);
          console.log('Fixed .env: Removed invalid characters (< or >)');
      } else {
          console.log('.env appears clean of angle brackets.');
      }
      
      // Check for common SRV port error
      if (cleaned.includes('mongodb+srv://') && cleaned.match(/mongodb\.net:\d+/)) {
           console.log('Warning: It looks like you have a port number in a mongodb+srv:// URL. This is not supported by MongoDB driver. Please remove the port (e.g. :27017).');
           
           // Auto-fix port
           const fixedPort = cleaned.replace(/(mongodb\.net):\d+/, '$1');
           fs.writeFileSync(envPath, fixedPort);
           console.log('Auto-fixed: Removed port from SRV connection string.');
      }

  } else {
      console.log('.env not found to fix.');
  }
} catch(e) {
  console.error('Error:', e);
}
