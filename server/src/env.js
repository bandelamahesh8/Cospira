import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';

// Load .env from SECURITY folder immediately on import
dotenv.config({ path: path.join(securityDir, '.env') });

console.log('✅ Environment variables loaded from SECURITY/.env');
