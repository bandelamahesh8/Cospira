import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const envPath = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY\\.env';

function getEnvData() {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const authtoken = content.match(/NGROK_AUTHTOKEN=(.*)/)?.[1]?.trim();
    const domain = content.match(/NGROK_DOMAIN=(.*)/)?.[1]?.trim();
    return { authtoken, domain };
  } catch (err) {
    console.error('Could not read .env file:', err);
    return {};
  }
}

function updateEnvUrl(url) {
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Update all relevant URLs
    const updates = [
      { key: 'VITE_WS_URL', value: url },
      { key: 'VITE_API_URL', value: url },
      { key: 'SERVER_URL', value: url },
      { key: 'MEDIASOUP_ANNOUNCED_IP', value: url.replace('https://', '') }
    ];

    updates.forEach(({ key, value }) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    });

    fs.writeFileSync(envPath, content);
    console.log(`Successfully mapped all protocols to: ${url}`);
  } catch (err) {
    console.error('Failed to update .env with tunnel URL:', err);
  }
}

async function start() {
  try {
    const { authtoken, domain } = getEnvData();
    
    if (!authtoken) {
      console.error('No authtoken found in .env');
      process.exit(1);
    }

    // Set authtoken first to ensure it's up to date
    console.log('Configuring ngrok authtoken...');
    const authProcess = spawn('npx', ['ngrok', 'config', 'add-authtoken', authtoken], { shell: true });
    await new Promise(resolve => authProcess.on('close', resolve));

    console.log(`Attempting to connect to ngrok... ${domain || 'Dynamic'}`);
    
    // Use CLI directly as it handles session persistence better than the current npm wrapper for v5
    const args = ['ngrok', 'http', '3001'];
    if (domain) {
      args.push('--url', domain); // v3+ uses --url instead of --domain
    }

    const ngrokProcess = spawn('npx', args, { shell: true });

    ngrokProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('online')) {
          console.log('ngrok is online.');
      }
    });

    ngrokProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('error')) {
            console.error(`ngrok error: ${output}`);
        }
    });

    // Since we are using a fixed domain, we can construct the URL
    const url = domain ? `https://${domain}` : null;
    
    if (url) {
      console.log(`NGROK_URL=${url}`);
      updateEnvUrl(url);
    } else {
        console.log('Wait for ngrok to assign a dynamic URL...');
        // For dynamic URL, we would need to poll the local API or parse stdout differently
    }

    console.log('NGROK is running in background. Keep this process alive to maintain the tunnel.');
    
    // Handle termination
    process.on('SIGINT', () => {
        ngrokProcess.kill();
        process.exit();
    });

    process.stdin.resume();
  } catch (err) {
    console.error('Error starting ngrok:', err.message || err);
    process.exit(1);
  }
}

start();
