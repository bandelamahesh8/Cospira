// Network connectivity test for Cospira Server
// Tests if server is accessible from different network interfaces

import http from 'http';

const testUrls = [
  'http://localhost:3001/health',
  'http://127.0.0.1:3001/health',
  'http://192.168.1.9:3001/health',
  'http://10.0.2.2:3001/health' // Android emulator
];

console.log('=== Cospira Server Network Test ===\n');

async function testConnection(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(url, { timeout: 3000 }, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          success: true,
          status: res.statusCode,
          duration: `${duration}ms`,
          data: data.substring(0, 100)
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        url,
        success: false,
        error: err.message,
        duration: `${duration}ms`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        url,
        success: false,
        error: 'Connection timeout',
        duration: `${duration}ms`
      });
    });
  });
}

async function runTests() {
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    const result = await testConnection(url);
    
    if (result.success) {
      console.log(`  ✅ SUCCESS (${result.duration}) - Status: ${result.status}`);
    } else {
      console.log(`  ❌ FAILED (${result.duration}) - ${result.error}`);
    }
    console.log('');
  }
  
  console.log('=== Test Complete ===');
  console.log('\nRecommendations:');
  console.log('- If localhost works but 192.168.1.9 fails: Check Windows Firewall');
  console.log('- If all fail: Server may not be running');
  console.log('- Run firewall-check.ps1 to diagnose and fix firewall issues');
}

runTests().catch(console.error);
