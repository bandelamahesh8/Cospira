import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // Priority order for interface names
  const priorities = ['Wi-Fi', 'WiFi', 'Ethernet', 'Wireless', 'en0', 'wlan0', 'eth0'];
  


  for (const match of priorities) {
      for (const name of Object.keys(interfaces)) {
          if (name.toLowerCase().includes(match.toLowerCase())) {
              for (const iface of interfaces[name]) {
                  if (iface.family === 'IPv4' && !iface.internal) {
                      return iface.address;
                  }
              }
          }
      }
  }

  // Fallback to first available
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
console.log(`Detected Local IP: ${localIP}`);

// Detect if we should force HTTP
const rootEnvPath = path.join(__dirname, '.env');
const forceHttp = fs.existsSync(rootEnvPath) && fs.readFileSync(rootEnvPath, 'utf8').includes('FORCE_HTTP=true');
const protocol = (fs.existsSync(path.join(__dirname, 'localhost+3.pem')) && !forceHttp) ? 'https' : 'http';

const files = [
  {
    path: rootEnvPath,
    replacements: [
      { key: 'VITE_WS_URL', value: `${protocol}://${localIP}:3001` },
      { key: 'VITE_API_URL', value: `${protocol}://${localIP}:3001` },
    ]
  },
  {
    path: path.join(__dirname, 'server', '.env'),
    replacements: [
      { key: 'CLIENT_URL', value: `http://${localIP}:8080` },
      { key: 'SERVER_URL', value: `${protocol}://${localIP}:3001` },
      { key: 'MEDIASOUP_ANNOUNCED_IP', value: localIP }
    ]
  },
  {
    path: path.join(__dirname, 'mobile-app', 'src', 'services', 'api.js'),
    patterns: [
      { 
        regex: /const getBaseUrl = \(\) => \{[\s\S]*?\};/,
        replacement: `const getBaseUrl = () => {\n  return 'http://${localIP}:3001';\n};`
      }
    ]
  },
  {
    path: path.join(__dirname, 'mobile-app', 'src', 'services', 'socket.service.js'),
    patterns: [
      {
        regex: /const getSocketUrl = \(\) => \{[\s\S]*?\};/,
        replacement: `const getSocketUrl = () => {\n  if (Platform.OS === 'web') {\n    const isSecure = window.location.protocol === 'https:';\n    const host = window.location.hostname === 'localhost' ? 'localhost' : '${localIP}';\n    return isSecure ? \`https://\${host}:3001\` : \`http://\${host}:3001\`;\n  }\n  return 'http://${localIP}:3001';\n};`
      }
    ]
  }
];

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    let content = fs.readFileSync(file.path, 'utf8');
    let modified = false;

    // Handle standard .env key=value replacements
    if (file.replacements) {
      file.replacements.forEach(({ key, value }) => {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(content)) {
          const match = content.match(regex)[0];
          if (match !== `${key}=${value}`) {
            content = content.replace(regex, `${key}=${value}`);
            modified = true;
            console.log(`Updated ${key} in ${path.basename(file.path)} to ${value}`);
          }
        } else {
          content += `\n${key}=${value}`;
          modified = true;
          console.log(`Added ${key} to ${path.basename(file.path)}`);
        }
      });
    }

    // Handle generic pattern replacements
    if (file.patterns) {
      file.patterns.forEach(({ regex, replacement }) => {
        if (regex.test(content)) {
          const currentContent = content.match(regex)[0];
          if (currentContent !== replacement) {
            content = content.replace(regex, replacement);
            modified = true;
            console.log(`Updated patterns in ${path.basename(file.path)}`);
          }
        }
      });
    }

    if (modified) {
      fs.writeFileSync(file.path, content);
      console.log(`Saved changes to ${file.path}`);
    } else {
      console.log(`No changes needed for ${file.path}`);
    }
  } else {
    console.warn(`File not found: ${file.path}`);
  }
});

